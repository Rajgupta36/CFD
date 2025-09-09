use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use tokio::sync::oneshot;

use crate::types::response::EngineResponse;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Order {
    pub order_id: String,
    pub asset: String,
    pub order_type: String,
    pub margin: i64,  //user will provide
    pub leverage: i8, //user
    pub open_price: i64,
    pub stoploss: f32, //in per
    pub takeprofit: f32,
    pub close_price: Option<i64>,
    pub quantity: i64,
    pub slippage: i8, //frontend
    pub user_id: String,
    pub pnl: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Balance {
    pub asset: String,
    pub token: Token,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Token {
    pub balance: i64,
    pub decimal: i8,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateOrderReq {
    #[serde(skip)]
    pub stream_id: String,
    pub user_id: String,
    pub order_type: String,
    pub quantity: i64,
    pub asset: String,
    pub leverage: i8,
    pub slippage: i8,
    pub stoploss: f32,
    pub takeprofit: f32,
    pub is_leveraged: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GetOrderReq {
    #[serde(skip)]
    pub stream_id: String,
    pub user_id: String,
    pub asset: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CloseOrderReq {
    #[serde(skip)]
    pub stream_id: String,
    pub user_id: String,
    pub asset: String,
    pub order_id: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CloseOrder {
    pub stream_id: String,
    pub user_id: String,
    pub order_id: String,
}

#[derive(Debug)]
pub enum EngineCommand {
    CreateOrder {
        stream_id: String,
        user_id: String,
        order_type: String,
        quantity: i64,
        stoploss: f32,
        takeprofit: f32,
        asset: String,
        leverage: i8,
        slippage: i8,
        is_leveraged: bool,
    },
    CloseOrder {
        asset: String,
        stream_id: String,
        user_id: String,
        order_id: String,
    },
    UpdatePrice {
        price: i64,
    },
    GetOrder {
        stream_id: String,
        user_id: String,
        asset: String,
        resp: oneshot::Sender<EngineResponse>,
    },
}

#[derive(Debug)]
pub enum BalanceCommand {
    Get {
        user_id: String,
        resp: oneshot::Sender<Option<Vec<Balance>>>,
    },
    GetUsd {
        user_id: String,
        resp: oneshot::Sender<i64>,
    },
    SetUsd {
        user_id: String,
        amount: i64,
        resp: oneshot::Sender<()>,
    },
}
