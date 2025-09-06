use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub enum EventType {
    price_updates,
    order_create,
    order_close,
    unknown,
}
