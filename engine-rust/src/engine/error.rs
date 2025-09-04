use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
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

#[derive(Debug, Serialize, Error)]
#[serde(tag = "error", content = "details")]
pub enum CloseOrderError {
    #[error("order not exist")]
    OrderNotExist,
    #[error("order failed")]
    OrderFailed,
}
