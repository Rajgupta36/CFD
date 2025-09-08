use crate::{
    engine::order_response::{CloseOrderResp, CreateOrderResp, GetOrderResp},
    types::order::Balance,
};
use serde::{Deserialize, Serialize};

//response
#[derive(Serialize, Deserialize)]
pub struct balance_get_usd_resp {
    pub res: String,
    pub payload: Usd,
}

#[derive(Serialize, Deserialize)]
pub struct Usd {
    pub usd: i64,
}

#[derive(Serialize, Deserialize)]
pub struct balance_get_all {
    pub res: String,
    pub payload: Option<Vec<Balance>>,
}

#[derive(Serialize, Deserialize)]
pub struct OrderRes {
    pub res: String,
    pub payload: EngineResponse,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum EngineResponse {
    CreateOrder(CreateOrderResp),
    CloseOrder(CloseOrderResp),
    GetOrder(GetOrderResp),
}
