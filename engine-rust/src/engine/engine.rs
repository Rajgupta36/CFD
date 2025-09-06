use crate::engine::error::{CloseOrderError, CloseOrderResp, CreateOrderError, CreateOrderResp};
use crate::types::order::{Balance, CloseOrderReq, CreateOrderReq, Order, Token};
use std::{collections::HashMap, error::Error};
use tokio::sync::mpsc;
use uuid::Uuid;

pub struct Engine {
    token: String,
    price: i64,
    lev_order: HashMap<String, Vec<Order>>,
    open_order: HashMap<String, Vec<Order>>,
    close_order: HashMap<String, Vec<Order>>,
    balance: HashMap<String, Vec<Balance>>,
}

impl Engine {
    pub fn new(token: String) -> Engine {
        Engine {
            token: token,
            price: 0,
            lev_order: HashMap::new(),
            open_order: HashMap::new(),
            close_order: HashMap::new(),
            balance: HashMap::new(),
        }
    }

    pub async fn create_order(
        &mut self,
        req: CreateOrderReq,
        channel: mpsc::Sender<(String, CreateOrderResp)>,
    ) -> CreateOrderResp {
        if req.margin <= 0 || req.leverage <= 0 || req.slippage <= 0 {
            let resp = CreateOrderResp::Error {
                msg: CreateOrderError::IncorrectInput,
            };
            let _ = channel.send((req.stream_id, resp.clone())).await;
            return resp;
        }

        if self.price == 0 {
            let resp = CreateOrderResp::Error {
                msg: CreateOrderError::IncorrectInput,
            };
            let _ = channel.send((req.stream_id, resp.clone())).await;
            return resp;
        }

        let order_id = Uuid::new_v4().to_string();
        let balances = self.balance.entry(req.user_id.clone()).or_insert_with(|| {
            vec![Balance {
                asset: "usd".to_string(),
                token: Token {
                    balance: 1000000,
                    decimal: 2,
                },
            }]
        });

        let mut balance = balances
            .iter_mut()
            .find(|b| b.asset == "usd")
            .ok_or(CreateOrderError::InsufficientBalance)
            .unwrap();

        let quantity = (req.margin * req.leverage as i64) / self.price;

        if balance.token.balance < req.margin {
            let resp = CreateOrderResp::Error {
                msg: CreateOrderError::InsufficientBalance,
            };
            let _ = channel.send((req.stream_id, resp.clone())).await;
            return resp;
        }

        balance.token.balance -= req.margin;

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
        let _ = channel.send((req.stream_id, resp.clone())).await;
        resp
    }

    pub async fn close_order(
        &mut self,
        req: CloseOrderReq,
        channel: mpsc::Sender<(String, CloseOrderResp)>,
    ) -> CloseOrderResp {
        print!(
            "close function called {} current price   {} {} {}",
            self.token, self.price, req.order_id, req.user_id
        );

        let mut resp = CloseOrderResp::Error {
            msg: CloseOrderError::OrderFailed,
        };

        if let Some(orders) = self.open_order.get_mut(&req.user_id) {
            if let Some(open_index) = orders.iter().position(|d| d.order_id == req.order_id) {
                let rmorder = orders.remove(open_index);
                let mut balance = self
                    .balance
                    .get_mut(&req.user_id)
                    .and_then(|d| d.iter_mut().find(|b| b.asset == "usd"))
                    .unwrap();
                balance.token.balance += rmorder.margin + rmorder.pnl;
                self.close_order
                    .entry(req.user_id.clone())
                    .or_insert_with(Vec::new)
                    .push(rmorder);
                resp = CloseOrderResp::Success {
                    msg: "order completed".to_string(),
                    order_id: req.order_id,
                };
                let _ = channel.send((req.stream_id, resp.clone())).await;
                return resp;
            }
        }

        if let Some(orders) = self.lev_order.get_mut(&req.user_id) {
            if let Some(lev_index) = orders.iter().position(|d| d.order_id == req.order_id) {
                let rmorder = orders.remove(lev_index);
                let mut balance = self
                    .balance
                    .get_mut(&req.user_id)
                    .and_then(|d| d.iter_mut().find(|b| b.asset == "usd"))
                    .unwrap();
                balance.token.balance += rmorder.margin + rmorder.pnl;
                self.close_order
                    .entry(req.user_id.clone())
                    .or_insert_with(Vec::new)
                    .push(rmorder);
                resp = CloseOrderResp::Success {
                    msg: "order completed".to_string(),
                    order_id: req.order_id,
                };
                let _ = channel.send((req.stream_id, resp.clone())).await;
                return resp;
            }
        }

        let _ = channel.send((req.stream_id, resp.clone())).await;
        return resp;
    }

    async fn liquidation_close(&mut self, req: CloseOrderReq) -> CloseOrderResp {
        let mut resp = CloseOrderResp::Error {
            msg: CloseOrderError::OrderFailed,
        };

        if let Some(orders) = self.lev_order.get_mut(&req.user_id) {
            if let Some(lev_index) = orders.iter().position(|d| d.order_id == req.order_id) {
                let rmorder = orders.remove(lev_index);
                let mut balance = self
                    .balance
                    .get_mut(&req.user_id)
                    .and_then(|d| d.iter_mut().find(|b| b.asset == "usd"))
                    .unwrap();
                balance.token.balance += rmorder.margin + rmorder.pnl;
                self.close_order
                    .entry(req.user_id.clone())
                    .or_insert_with(Vec::new)
                    .push(rmorder);
                resp = CloseOrderResp::Success {
                    msg: "order completed".to_string(),
                    order_id: req.order_id,
                };
                return resp;
            }
        }

        return resp;
    }

    pub async fn update_price(&mut self, price: i64) {
        self.price = price;
        for (_key, value) in self.open_order.iter_mut() {
            for order in value {
                order.pnl = if (order.order_type == "buy") {
                    (self.price - order.open_price) * order.quantity as i64
                } else {
                    (order.open_price - self.price) * order.quantity as i64
                }
            }
        }
        let mut to_close = Vec::new();
        //need to update the pnl only and auto close the trade where margin + pnl=0 ;
        for (_key, value) in self.lev_order.iter_mut() {
            for order in value.iter_mut() {
                order.pnl = if (order.order_type == "buy") {
                    (self.price - order.open_price) * order.quantity as i64
                } else {
                    (self.price - order.open_price) * order.quantity as i64
                };

                if (order.pnl + order.margin <= 0) {
                    to_close.push((order.order_id.clone(), order.user_id.clone()));
                }
            }
        }

        for (order_id, user_id) in to_close {
            self.liquidation_close(CloseOrderReq {
                stream_id: "".to_string(),
                user_id,
                order_id,
            });
        }
    }
}
