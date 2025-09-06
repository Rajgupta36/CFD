pub mod engine;
pub mod redis;
pub mod serializer;

use std::sync::Arc;
use tokio::sync::Mutex;

use crate::redis::redis_manager;

#[tokio::main]
async fn main() {
    let channel = String::from("channel-1");
    let btc_manager = Arc::new(Mutex::new(engine::engine::Engine::new(String::from("BTC"))));
    let eth_manager = Arc::new(Mutex::new(engine::engine::Engine::new(String::from("BTC"))));
    let sol_manager = Arc::new(Mutex::new(engine::engine::Engine::new(String::from("BTC"))));

    redis_manager(channel, btc_manager, eth_manager, sol_manager).await;
}
