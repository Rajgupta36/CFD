pub mod engine;
pub mod redis;
pub mod types;

use crate::redis::redis_manager;

#[tokio::main]
async fn main() {
    let channel = String::from("channel-1");
    redis_manager(channel).await;
}
