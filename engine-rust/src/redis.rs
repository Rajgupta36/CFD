use crate::engine::engine::Engine;
use crate::serializer::event::EventType;
use redis::{AsyncCommands, FromRedisValue, streams::StreamReadOptions};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use serde_redis::from_redis_value;
use std::{collections::HashMap, sync::Arc, time::Duration};
use tokio::sync::{Mutex, mpsc};
extern crate redis;

#[derive(Clone, Debug, Deserialize, Serialize)]
struct CryptoInfo {
    symbol: String,
    price: f64,
    decimal: i32,
}

type CryptoMap = HashMap<String, CryptoInfo>;

pub async fn redis_manager(
    topic: String,
    btc_manager: Arc<Mutex<Engine>>,
    eth_manager: Arc<Mutex<Engine>>,
    sol_manager: Arc<Mutex<Engine>>,
) -> () {
    let client = redis::Client::open("redis://localhost:6379/").unwrap();
    let topic = topic;

    let mut offset = String::from("$");
    let (tx_sol, mut rx_sol) = mpsc::channel::<CryptoInfo>(100);
    let (tx_eth, mut rx_eth) = mpsc::channel::<CryptoInfo>(100);
    let (tx_btc, mut rx_btc) = mpsc::channel::<CryptoInfo>(100);

    //thread spawn for each market
    tokio::spawn(async move {
        println!("ETH task started");
        while let Some(data) = rx_eth.recv().await {
            println!("hello from eth")
        }
    });

    tokio::spawn(async move {
        println!("SOl task started");
        while let Some(data) = rx_sol.recv().await {
            println!("hello from sol");
        }
    });

    tokio::spawn(async move {
        println!("BTC task started");
        while let Some(data) = rx_btc.recv().await {
            println!("hello from btc");
        }
    });

    let mut con = client.get_async_connection().await.unwrap();
    loop {
        let opts = StreamReadOptions::default().block(1000);
        let response: redis::streams::StreamReadReply = con
            .xread_options(&[&topic], &[&offset], &opts)
            .await
            .unwrap();

        for stream_key in response.keys {
            for stream_id in stream_key.ids {
                offset = stream_id.id.clone();

                for (field, value) in stream_id.map.iter() {
                    let event_type = match field.as_str() {
                        "price_updates" => EventType::price_updates,
                        "order_create" => EventType::order_create,
                        "order_close" => EventType::order_close,
                        _ => EventType::unknown,
                    };

                    let value_data: String = from_redis_value(value).unwrap();

                    match event_type {
                        EventType::price_updates => {
                            let parsed: Result<CryptoMap, _> = serde_json::from_str(&value_data);
                            if let Ok(crypto_map) = parsed {
                                print!("{:?}", crypto_map);
                                for (symbol, crypto_info) in crypto_map {
                                    match symbol.as_str() {
                                        "BTC" => {
                                            tx_btc.send(crypto_info).await.unwrap();
                                        }
                                        "ETH" => {
                                            tx_eth.send(crypto_info).await.unwrap();
                                        }
                                        "SOL" => {
                                            tx_sol.send(crypto_info).await.unwrap();
                                        }
                                        _ => {
                                            println!("Unknown symbol: {}", symbol);
                                        }
                                    }
                                }
                            }
                        }
                        EventType::order_create => {
                            // handle create order (TODO)
                        }
                        EventType::order_close => {
                            // handle close order (TODO)
                        }
                        EventType::unknown => {
                            print!("unknown event")
                        }
                    }
                }
            }
        }
    }
}
