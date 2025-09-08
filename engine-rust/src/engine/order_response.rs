use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::types::order::Order;

#[derive(Debug, Error, Serialize, Clone, Deserialize)]
#[serde(tag = "error", content = "detail")]
pub enum CreateOrderError {
    #[error("pls use order type put or short")]
    OrderTypeMisMatch,
    #[error("user not exist")]
    UserNotExist,
    #[error("insufficient balances")]
    InsufficientBalance,
    #[error("please provide correct input")]
    IncorrectInput,
    #[error("order failed")]
    OrderFailed,
}

#[derive(Debug, Serialize, Error, Clone, Deserialize)]
#[serde(tag = "error", content = "details")]
pub enum CloseOrderError {
    #[error("order not exist")]
    OrderNotExist,
    #[error("order failed")]
    OrderFailed,
}

#[derive(Debug, Serialize, Clone, Deserialize)]
#[serde(tag = "status", content = "details")]
pub enum CreateOrderResp {
    Success { msg: String, order_id: String },
    Error { msg: CreateOrderError },
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "status", content = "details")]
pub enum GetOrderResp {
    Success { msg: String, orders: Vec<Order> },
    Error { msg: String },
}

#[derive(Debug, Serialize, Clone, Deserialize)]
pub enum CloseOrderResp {
    Success { msg: String, order: Order },
    Error { msg: CloseOrderError },
}
