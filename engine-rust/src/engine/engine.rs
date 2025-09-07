use crate::engine::balancemanager::BalanceManagerCommand;
use crate::engine::error::{CloseOrderError, CloseOrderResp, CreateOrderError, CreateOrderResp};
use crate::types::order::{CloseOrderReq, CreateOrderReq, Order};
use std::collections::HashMap;
use tokio::sync::{mpsc, oneshot};
use uuid::Uuid;

pub struct Engine {
    token: String,
    price: i64,
    lev_order: HashMap<String, Vec<Order>>,
    open_order: HashMap<String, Vec<Order>>,
    close_order: HashMap<String, Vec<Order>>,
    balance_tx: mpsc::Sender<BalanceManagerCommand>,
}

impl Engine {
    pub fn new(token: String, balance_tx: mpsc::Sender<BalanceManagerCommand>) -> Engine {
        Engine {
            token: token,
            price: 0,
            lev_order: HashMap::new(),
            open_order: HashMap::new(),
            close_order: HashMap::new(),
            balance_tx,
        }
    }

    pub async fn create_order(
        &mut self,
        req: CreateOrderReq,
        channel: mpsc::Sender<(String, CreateOrderResp)>,
    ) -> CreateOrderResp {
        if req.margin <= 0 || req.leverage <= 0 || req.slippage <= 0 || self.price == 0 {
            let resp = CreateOrderResp::Error {
                msg: CreateOrderError::IncorrectInput,
            };
            let _ = channel.send((req.stream_id, resp.clone())).await;
            return resp;
        }

        let (tx, rx) = oneshot::channel();
        let _ = self
            .balance_tx
            .send(BalanceManagerCommand::GetUsd {
                user_id: req.user_id.clone(),
                resp: tx,
            })
            .await;
        let mut usd_balance = rx.await.unwrap_or(0);

        if usd_balance < req.margin {
            let resp = CreateOrderResp::Error {
                msg: CreateOrderError::InsufficientBalance,
            };
            let _ = channel.send((req.stream_id, resp.clone())).await;
            return resp;
        }

        usd_balance -= req.margin;
        let (tx_set, rx_set) = oneshot::channel();
        let _ = self
            .balance_tx
            .send(BalanceManagerCommand::SetUsd {
                user_id: req.user_id.clone(),
                amount: usd_balance,
                resp: tx_set,
            })
            .await;
        let _ = rx_set.await;

        let order_id = Uuid::new_v4().to_string();
        let quantity = (req.margin * req.leverage as i64) / self.price;

        let order = Order {
            order_id: order_id.clone(),
            asset: req.asset,
            order_type: req.order_type,
            margin: req.margin,
            leverage: req.leverage,
            open_price: self.price,
            close_price: None,
            quantity: quantity as i16,
            slippage: req.slippage,
            user_id: req.user_id.clone(),
            pnl: 0,
        };

        if req.leverage > 1 {
            self.lev_order
                .entry(req.user_id.clone())
                .or_insert_with(Vec::new)
                .push(order);
        } else {
            self.open_order
                .entry(req.user_id.clone())
                .or_insert_with(Vec::new)
                .push(order);
        }

        let resp = CreateOrderResp::Success {
            msg: "order success".to_string(),
            order_id,
        };
        print!("order confirmed");
        let _ = channel.send((req.stream_id, resp.clone())).await;
        print!("order sended to res");
        resp
    }

    pub async fn close_order(
        &mut self,
        req: CloseOrderReq,
        channel: mpsc::Sender<(String, CloseOrderResp)>,
    ) -> CloseOrderResp {
        let mut resp = CloseOrderResp::Error {
            msg: CloseOrderError::OrderFailed,
        };

        let orders_collections = [&mut self.open_order, &mut self.lev_order];

        for orders in orders_collections {
            if let Some(user_orders) = orders.get_mut(&req.user_id) {
                if let Some(pos) = user_orders.iter().position(|o| o.order_id == req.order_id) {
                    let order = user_orders.remove(pos);

                    let (tx, rx) = oneshot::channel();
                    let _ = self
                        .balance_tx
                        .send(BalanceManagerCommand::GetUsd {
                            user_id: req.user_id.clone(),
                            resp: tx,
                        })
                        .await;
                    let mut usd_balance = rx.await.unwrap_or(0);
                    usd_balance += order.margin + order.pnl;
                    let (tx_set, rx_set) = oneshot::channel();
                    let _ = self
                        .balance_tx
                        .send(BalanceManagerCommand::SetUsd {
                            user_id: req.user_id.clone(),
                            amount: usd_balance,
                            resp: tx_set,
                        })
                        .await;
                    let _ = rx_set.await;

                    self.close_order
                        .entry(req.user_id.clone())
                        .or_insert_with(Vec::new)
                        .push(order);

                    resp = CloseOrderResp::Success {
                        msg: "order completed".to_string(),
                        order_id: req.order_id,
                    };
                    break;
                }
            }
        }

        let _ = channel.send((req.stream_id, resp.clone())).await;
        resp
    }

    async fn liquidation_close(&mut self, req: CloseOrderReq) -> CloseOrderResp {
        let mut resp = CloseOrderResp::Error {
            msg: CloseOrderError::OrderFailed,
        };

        if let Some(user_orders) = self.lev_order.get_mut(&req.user_id) {
            if let Some(pos) = user_orders.iter().position(|o| o.order_id == req.order_id) {
                let order = user_orders.remove(pos);

                let (tx, rx) = oneshot::channel();
                let _ = self
                    .balance_tx
                    .send(BalanceManagerCommand::GetUsd {
                        user_id: req.user_id.clone(),
                        resp: tx,
                    })
                    .await;
                let mut usd_balance = rx.await.unwrap_or(0);
                usd_balance += order.margin + order.pnl;
                let (tx_set, rx_set) = oneshot::channel();
                let _ = self
                    .balance_tx
                    .send(BalanceManagerCommand::SetUsd {
                        user_id: req.user_id.clone(),
                        amount: usd_balance,
                        resp: tx_set,
                    })
                    .await;
                let _ = rx_set.await;

                self.close_order
                    .entry(req.user_id.clone())
                    .or_insert_with(Vec::new)
                    .push(order);

                resp = CloseOrderResp::Success {
                    msg: "order completed".to_string(),
                    order_id: req.order_id,
                };
            }
        }

        resp
    }

    pub async fn update_price(&mut self, price: i64) {
        self.price = price;
        for value in self.open_order.values_mut() {
            for order in value {
                order.pnl = if order.order_type == "buy" {
                    (self.price - order.open_price) * order.quantity as i64
                } else {
                    (order.open_price - self.price) * order.quantity as i64
                }
            }
        }

        let mut to_close = Vec::new();
        for value in self.lev_order.values_mut() {
            for order in value.iter_mut() {
                order.pnl = if order.order_type == "buy" {
                    (self.price - order.open_price) * order.quantity as i64
                } else {
                    (self.price - order.open_price) * order.quantity as i64
                };

                if order.pnl + order.margin <= 0 {
                    to_close.push(CloseOrderReq {
                        stream_id: "".to_string(),
                        user_id: order.user_id.clone(),
                        order_id: order.order_id.clone(),
                        asset: order.asset.clone(),
                    });
                }
            }
        }

        for req in to_close {
            let _ = self.liquidation_close(req).await;
        }
    }
}
