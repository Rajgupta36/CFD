use crate::{
    engine::error::{CloseOrderResp, CreateOrderResp, GetOrderResp},
    types::order::{Balance, Order},
};
use serde::{Deserialize, Serialize};

//response
#[derive(Serialize, Deserialize)]
pub struct balance_get_usd_resp {
    pub res: String,
    pub payload: usd,
}

#[derive(Serialize, Deserialize)]
pub struct usd {
    pub usd: i64,
}

#[derive(Serialize, Deserialize)]
pub struct balance_get_all {
    pub res: String,
    pub payload: Option<Vec<Balance>>,
}

#[derive(Serialize, Deserialize)]
pub struct open_order {
    pub res: String,
    pub payload: Order,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum EngineResponse {
    CreateOrder(CreateOrderResp),
    CloseOrder(CloseOrderResp),
    GetOrder(GetOrderResp),
}
