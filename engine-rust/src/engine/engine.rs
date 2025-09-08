use crate::engine::balancemanager::BalanceManagerCommand;
use crate::engine::order_response::{
    CloseOrderError, CloseOrderResp, CreateOrderError, CreateOrderResp, GetOrderResp,
};
use crate::types::order::{CloseOrderReq, CreateOrderReq, GetOrderReq, Order};
use crate::types::response::EngineResponse;
use rust_decimal::{Decimal, prelude::ToPrimitive};
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
            token,
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
        channel: mpsc::Sender<(String, EngineResponse)>,
    ) {
        if req.margin <= 0 || req.leverage <= 0 || req.slippage <= 0 || self.price == 0 {
            let resp = CreateOrderResp::Error {
                msg: CreateOrderError::IncorrectInput,
            };
            let _ = channel
                .send((
                    req.stream_id.clone(),
                    EngineResponse::CreateOrder(resp.clone()),
                ))
                .await;
            return;
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
            let _ = channel
                .send((
                    req.stream_id.clone(),
                    EngineResponse::CreateOrder(resp.clone()),
                ))
                .await;
            return;
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
        let quantity =
            (Decimal::from(req.margin) * Decimal::from(req.leverage)) / Decimal::from(self.price);
        println!("Quantity = {}", quantity);
        let order = Order {
            order_id: order_id.clone(),
            asset: req.asset,
            order_type: req.order_type,
            margin: req.margin,
            leverage: req.leverage,
            open_price: self.price,
            close_price: None,
            quantity: quantity,
            slippage: req.slippage,
            user_id: req.user_id.clone(),
            pnl: Decimal::ZERO,
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
        println!("order confirmed");
        let _ = channel
            .send((req.stream_id, EngineResponse::CreateOrder(resp.clone())))
            .await;
        println!("order sent");
    }

    pub async fn close_order(
        &mut self,
        req: CloseOrderReq,
        channel: mpsc::Sender<(String, EngineResponse)>,
    ) {
        let mut resp = CloseOrderResp::Error {
            msg: CloseOrderError::OrderFailed,
        };

        let orders_collections = [&mut self.open_order, &mut self.lev_order];

        for orders in orders_collections {
            if let Some(user_orders) = orders.get_mut(&req.user_id) {
                if let Some(pos) = user_orders.iter().position(|o| o.order_id == req.order_id) {
                    let mut order = user_orders.remove(pos);

                    order.close_price = Some(self.price);

                    let (tx, rx) = oneshot::channel();
                    let _ = self
                        .balance_tx
                        .send(BalanceManagerCommand::GetUsd {
                            user_id: req.user_id.clone(),
                            resp: tx,
                        })
                        .await;
                    let mut usd_balance = rx.await.unwrap_or(0);
                    usd_balance += order.margin + order.pnl.round().to_i64().unwrap();
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
                        .push(order.clone());

                    resp = CloseOrderResp::Success {
                        msg: "order completed".to_string(),
                        order: order.clone(),
                    };
                    break;
                }
            }
        }

        let _ = channel
            .send((req.stream_id, EngineResponse::CloseOrder(resp.clone())))
            .await;
    }

    async fn liquidation_close(&mut self, req: CloseOrderReq) -> CloseOrderResp {
        let mut resp = CloseOrderResp::Error {
            msg: CloseOrderError::OrderFailed,
        };

        if let Some(user_orders) = self.lev_order.get_mut(&req.user_id) {
            if let Some(pos) = user_orders.iter().position(|o| o.order_id == req.order_id) {
                let mut order = user_orders.remove(pos);
                order.close_price = Some(self.price);

                let (tx, rx) = oneshot::channel();
                let _ = self
                    .balance_tx
                    .send(BalanceManagerCommand::GetUsd {
                        user_id: req.user_id.clone(),
                        resp: tx,
                    })
                    .await;
                let mut usd_balance = rx.await.unwrap_or(0);
                usd_balance += order.margin + order.pnl.round().to_i64().unwrap();
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
                    .push(order.clone());

                resp = CloseOrderResp::Success {
                    msg: "order liquidated".to_string(),
                    order: order.clone(),
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
                    (Decimal::from(self.price) - Decimal::from(order.open_price)) * order.quantity
                } else {
                    (Decimal::from(order.open_price) - Decimal::from(self.price)) * order.quantity
                };
            }
        }

        let mut to_close = Vec::new();
        for value in self.lev_order.values_mut() {
            for order in value.iter_mut() {
                order.pnl = if order.order_type == "buy" {
                    (Decimal::from(self.price) - Decimal::from(order.open_price)) * order.quantity
                } else {
                    (Decimal::from(order.open_price) - Decimal::from(self.price)) * order.quantity
                };

                if order.pnl + Decimal::from(order.margin) <= Decimal::ZERO {
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
            self.liquidation_close(req).await;
        }
    }

    pub async fn get_open_order(
        &mut self,
        req: GetOrderReq,
        channel: mpsc::Sender<(String, EngineResponse)>,
    ) {
        let mut all_orders = Vec::new();

        if let Some(open_orders) = self.open_order.get(&req.user_id) {
            all_orders.extend(open_orders.iter().cloned());
        }

        if let Some(lev_orders) = self.lev_order.get(&req.user_id) {
            all_orders.extend(lev_orders.iter().cloned());
        }

        let resp = if !all_orders.is_empty() {
            GetOrderResp::Success {
                msg: "orders retrieved successfully".to_string(),
                orders: all_orders,
            }
        } else {
            GetOrderResp::Error {
                msg: "no open orders found".to_string(),
            }
        };

        let _ = channel
            .send((req.stream_id, EngineResponse::GetOrder(resp)))
            .await;
    }
}
