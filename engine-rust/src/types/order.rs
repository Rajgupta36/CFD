use crate::engine::error::{CloseOrderResp, CreateOrderResp};
use serde::Deserialize;
use tokio::sync::oneshot;
#[derive(Debug)]
pub struct Order {
    pub order_id: String,
    pub asset: String,
    pub order_type: String,
    pub margin: i64,  //user will provide
    pub leverage: i8, //user
    pub open_price: i64,
    pub close_price: Option<i64>,
    pub quantity: i16,
    pub slippage: i8, //frontend
    pub user_id: String,
    pub pnl: i64,
}

#[derive(Debug, Clone)]
pub struct Balance {
    pub asset: String,
    pub token: Token,
}

#[derive(Debug, Clone)]
pub struct Token {
    pub balance: i64,
    pub decimal: i8,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateOrderReq {
    pub stream_id: String,
    pub user_id: String,
    pub order_type: String,
    pub margin: i64,
    pub asset: String,
    pub leverage: i8,
    pub slippage: i8,
    pub is_leveraged: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CloseOrderReq {
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
        margin: i64,
        asset: String,
        leverage: i8,
        slippage: i8,
        is_leveraged: bool,
        resp: oneshot::Sender<(String, CreateOrderResp)>,
    },
    CloseOrder {
        stream_id: String,
        user_id: String,
        order_id: String,
        resp: oneshot::Sender<(String, CloseOrderResp)>,
    },
    UpdatePrice {
        price: i64,
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
