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

#[derive(Debug)]
pub struct Balance {
    pub asset: String,
    pub token: Token,
}

#[derive(Debug)]
pub struct Token {
    pub balance: i64,
    pub decimal: i8,
}
