use crate::engine::error::CreateOrderResp;
use crate::types::event::EventType;
use crate::types::order::{Balance, CloseOrderReq, CreateOrderReq};
use crate::{engine::engine::Engine, types::order::EngineCommand};
use redis::{AsyncCommands, streams::StreamReadOptions};
use serde::{Deserialize, Serialize};
use serde_redis::from_redis_value;
use std::collections::HashMap;
use tokio::sync::oneshot::channel;
use tokio::sync::{mpsc, oneshot};
extern crate redis;

#[derive(Clone, Debug, Deserialize, Serialize)]
struct CryptoInfo {
    symbol: String,
    price: i64,
    decimal: i32,
}

type CryptoMap = HashMap<String, CryptoInfo>;

pub async fn redis_manager(topic: String) -> () {
    let client = redis::Client::open("redis://localhost:6379/").unwrap();
    let topic = topic;

    let mut offset = String::from("$");
    let (tx_sol, mut rx_sol) = mpsc::channel::<EngineCommand>(100);
    let (tx_eth, mut rx_eth) = mpsc::channel::<EngineCommand>(100);
    let (tx_btc, mut rx_btc) = mpsc::channel::<EngineCommand>(100);

    //thread spawn for each market
    tokio::spawn(async move {
        let mut eth_manager = Engine::new(String::from("ETH"));
        println!("ETH");
        while let Some(data) = rx_eth.recv().await {
            match (data) {
                EngineCommand::UpdatePrice { price } => {
                    eth_manager.update_price(price);
                }
                EngineCommand::CreateOrder {
                    stream_id,
                    user_id,
                    order_type,
                    margin,
                    asset,
                    leverage,
                    slippage,
                    is_leveraged,
                    resp,
                } => {
                    let (mut tx, mut rx) = oneshot::channel();
                    let response = eth_manager.create_order(
                        CreateOrderReq {
                            stream_id,
                            user_id,
                            order_type,
                            margin,
                            asset,
                            leverage,
                            slippage,
                            is_leveraged,
                        },
                        tx,
                    );
                    print!("response iss {:?}", response);
                }
                EngineCommand::CloseOrder {
                    stream_id,
                    user_id,
                    order_id,
                    resp,
                } => {
                    let (mut tx, mut rx) = oneshot::channel();
                    let response = eth_manager.close_order(
                        CloseOrderReq {
                            stream_id,
                            user_id,
                            order_id,
                        },
                        tx,
                    );
                    print!("response iss {:?}", response)
                }
            }
        }
    });

    tokio::spawn(async move {
        println!("SOl task started");
        let mut sol_manager = Engine::new(String::from("SOL"));
        while let Some(data) = rx_sol.recv().await {
            match (data) {
                EngineCommand::UpdatePrice { price } => {
                    sol_manager.update_price(price);
                }
                EngineCommand::CreateOrder {
                    stream_id,
                    user_id,
                    order_type,
                    margin,
                    asset,
                    leverage,
                    slippage,
                    is_leveraged,
                    resp,
                } => {
                    sol_manager.create_order(CreateOrderReq {
                        user_id,
                        order_type,
                        margin,
                        asset,
                        leverage,
                        slippage,
                        is_leveraged,
                    });
                }
                EngineCommand::CloseOrder {
                    stream_id,
                    user_id,
                    order_id,
                    resp,
                } => {
                    sol_manager.close_order(CloseOrderReq { user_id, order_id });
                }
            }
        }
    });

    tokio::spawn(async move {
        println!("BTC task started");
        let mut btc_manager = Engine::new(String::from("BTC"));
        while let Some(data) = rx_btc.recv().await {
            match (data) {
                EngineCommand::UpdatePrice { price } => {
                    btc_manager.update_price(price);
                }
                EngineCommand::CreateOrder {
                    stream_id,
                    user_id,
                    order_type,
                    margin,
                    asset,
                    leverage,
                    slippage,
                    is_leveraged,
                    resp,
                } => {
                    btc_manager.create_order(CreateOrderReq {
                        user_id,
                        order_type,
                        margin,
                        asset,
                        leverage,
                        slippage,
                        is_leveraged,
                    });
                }
                EngineCommand::CloseOrder {
                    stream_id,
                    user_id,
                    order_id,
                    resp,
                } => {
                    btc_manager.close_order(CloseOrderReq { user_id, order_id });
                }
            }
        }
    });

    let mut con = client.get_async_connection().await.unwrap();
    loop {
        let opts = StreamReadOptions::default().block(0).count(1);
        let response: redis::streams::StreamReadReply = con
            .xread_options(&[&topic], &[&offset], &opts)
            .await
            .unwrap();
        print!("response is coming ");
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
                                for (symbol, crypto_info) in crypto_map {
                                    match symbol.as_str() {
                                        "BTC" => {
                                            tx_btc
                                                .send(EngineCommand::UpdatePrice {
                                                    price: crypto_info.price,
                                                })
                                                .await
                                                .unwrap();
                                        }
                                        "ETH" => {
                                            tx_eth
                                                .send(EngineCommand::UpdatePrice {
                                                    price: crypto_info.price,
                                                })
                                                .await
                                                .unwrap();
                                        }
                                        "SOL" => {
                                            tx_sol
                                                .send(EngineCommand::UpdatePrice {
                                                    price: crypto_info.price,
                                                })
                                                .await
                                                .unwrap();
                                        }
                                        _ => {
                                            println!("Unknown symbol: {}", symbol);
                                        }
                                    }
                                }
                            }
                        }
                        EventType::order_create => {
                            if let Ok(order_data) =
                                serde_json::from_str::<CreateOrderReq>(&value_data)
                            {
                                let (resp_tx, resp_rx) = channel();
                                let cmd = EngineCommand::CreateOrder {
                                    stream_id: stream_id.id.clone(),
                                    user_id: order_data.user_id,
                                    order_type: order_data.order_type,
                                    margin: order_data.margin,
                                    asset: order_data.asset,
                                    leverage: order_data.leverage,
                                    slippage: order_data.slippage,
                                    is_leveraged: order_data.is_leveraged,
                                    resp: resp_tx,
                                };
                                tx_btc.send(cmd).await.unwrap();

                                let (id, res) = resp_rx.await.unwrap();
                                println!("create order response for stream_id {}: {:?}", id, res);
                            }
                        }
                        EventType::order_close => {
                            if let Ok(close_data) =
                                serde_json::from_str::<CloseOrderReq>(&value_data)
                            {
                                let (resp_tx, resp_rx) = channel();
                                let cmd = EngineCommand::CloseOrder {
                                    stream_id: stream_id.id.clone(),
                                    user_id: close_data.user_id,
                                    order_id: close_data.order_id,
                                    resp: resp_tx,
                                };
                                tx_btc.send(cmd).await.unwrap();

                                let (id, res) = resp_rx.await.unwrap();
                                println!("close order response for stream_id {}: {:?}", id, res);
                            }
                        }
                        EventType::unknown => {
                            println!("unknown event");
                        }
                    }
                }
            }
        }
    }
}
