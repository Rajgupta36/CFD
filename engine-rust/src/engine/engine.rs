use uuid::Uuid;

use crate::engine::error::{CloseOrderError, CreateOrderError};
use crate::engine::types::{Balance, Order};
use std::{collections::HashMap, error::Error};

struct Engine {
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

    pub fn create_order(
        &mut self,
        user_id: String,
        order_type: String,
        margin: i64,
        asset: String,
        leverage: i8,
        slippage: i8,
        is_leveraged: bool,
    ) -> Result<(), CreateOrderError> {
        if (margin <= 0 || leverage <= 0 || slippage <= 0) {
            return Err(CreateOrderError::IncorrectInput);
        }
        if self.price == 0 {
            return Err(CreateOrderError::IncorrectInput);
        }
        let order_id = Uuid::new_v4().to_string();
        let mut balance = self
            .balance
            .get_mut(&user_id)
            .and_then(|vec| vec.iter_mut().find(|b| b.asset == "usd"))
            .ok_or(CreateOrderError::InsufficientBalance)?;
        //we don't have quan
        let quantity = (margin * leverage as i64) / self.price;
        if (balance.token.balance < margin) {
            return Err(CreateOrderError::InsufficientBalance);
        }

        balance.token.balance -= margin;
        let order = Order {
            order_id: order_id,
            asset,
            order_type,
            margin,
            leverage,
            open_price: self.price,
            close_price: None,
            quantity: quantity as i16,
            slippage,
            user_id: user_id.clone(),
            pnl: 0,
        };

        if (leverage > 1) {
            self.lev_order
                .entry(user_id)
                .or_insert_with(Vec::new)
                .push(order);
        } else {
            self.open_order
                .entry(user_id)
                .or_insert_with(Vec::new)
                .push(order)
        }

        Ok(())
    }

    pub fn close_order(
        &mut self,
        user_id: String,
        order_id: String,
    ) -> Result<(), CloseOrderError> {
        let isOrder: bool = false;
        if let Some(orders) = self.open_order.get_mut(&user_id) {
            if let Some(open_index) = orders.iter().position(|d| d.order_id == order_id) {
                let rmorder = orders.remove(open_index);
                let mut balance = self
                    .balance
                    .get_mut(&user_id)
                    .and_then(|d| d.iter_mut().find(|b| b.asset == "usd"))
                    .unwrap();
                balance.token.balance += rmorder.margin + rmorder.pnl;
                self.close_order
                    .entry(user_id.clone())
                    .or_insert_with(Vec::new)
                    .push(rmorder);
                return Ok(());
            }
        }

        if let Some(orders) = self.lev_order.get_mut(&user_id) {
            if let Some(lev_index) = orders.iter().position(|d| d.order_id == order_id) {
                let rmorder = orders.remove(lev_index);
                let mut balance = self
                    .balance
                    .get_mut(&user_id)
                    .and_then(|d| d.iter_mut().find(|b| b.asset == "usd"))
                    .unwrap();
                balance.token.balance += rmorder.margin + rmorder.pnl;
                self.close_order
                    .entry(user_id.clone())
                    .or_insert_with(Vec::new)
                    .push(rmorder);
                return Ok(());
            }
        }

        return Err(CloseOrderError::OrderNotExist);
    }

    pub fn update_price(&mut self, price: i64) -> Result<(), Box<dyn Error>> {
        //need to update the pnl only and auto close the trade where margin + pnl   =0 ;
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
        for (_key, value) in self.lev_order.iter_mut() {
            for order in value.iter_mut() {
                order.pnl = if (order.order_type == "buy") {
                    (self.price - order.open_price) * order.quantity as i64
                } else {
                    (self.price - order.open_price) * order.quantity as i64
                };

                if (order.pnl <= 0) {
                    to_close.push((order.order_id.clone(), order.user_id.clone()));
                    return Ok(());
                }
            }
        }

        for (order_id, user_id) in to_close {
            self.close_order(user_id, order_id);
        }
        Ok(())
    }
}
