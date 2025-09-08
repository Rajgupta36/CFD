use crate::engine::balancemanager::{BalanceManagerCommand, run_balance_manager};
use crate::engine::error::{CloseOrderResp, CreateOrderResp};
use crate::types::balance;
use crate::types::event::EventType;
use crate::types::order::{CloseOrderReq, CreateOrderReq};
use crate::types::response::{EngineResponse, balance_get_all, balance_get_usd_resp, usd};
use crate::{engine::engine::Engine, types::order::EngineCommand};
use redis::Commands;
use redis::{AsyncCommands, streams::StreamReadOptions};
use serde::{Deserialize, Serialize};
use serde_redis::from_redis_value;
use std::collections::HashMap;
use tokio::sync::{mpsc, oneshot};

#[derive(Clone, Debug, Deserialize, Serialize)]
struct CryptoInfo {
    symbol: String,
    price: i64,
    decimal: i32,
}

type CryptoMap = HashMap<String, CryptoInfo>;

pub async fn redis_manager(topic: String) {
    let client = redis::Client::open("redis://localhost:6379/").unwrap();

    let mut send_data_1 = client.clone();

    let mut offset = "$".to_string();

    let (tx_sol, rx_sol) = mpsc::channel::<EngineCommand>(100);
    let (tx_eth, rx_eth) = mpsc::channel::<EngineCommand>(100);
    let (tx_btc, rx_btc) = mpsc::channel::<EngineCommand>(100);
    let (balance_tx, balance_rx) = mpsc::channel::<BalanceManagerCommand>(100);
    let (tx_res, mut rx_res) = mpsc::channel::<(String, EngineResponse)>(100);

    tokio::spawn(run_balance_manager(balance_rx));

    for (symbol, mut rx) in [("BTC", rx_btc), ("ETH", rx_eth), ("SOL", rx_sol)] {
        let symbol = symbol.to_string();
        let tx_res_clone = tx_res.clone();
        let balance_tx_clone = balance_tx.clone();
        tokio::spawn(async move {
            let mut engine = Engine::new(symbol.clone(), balance_tx_clone);
            println!("{} task started", symbol);

            while let Some(cmd) = rx.recv().await {
                match cmd {
                    EngineCommand::UpdatePrice { price } => engine.update_price(price).await,
                    EngineCommand::CreateOrder {
                        stream_id,
                        user_id,
                        order_type,
                        margin,
                        asset,
                        leverage,
                        slippage,
                        is_leveraged,
                    } => {
                        print!("order is processing");
                        engine
                            .create_order(
                                CreateOrderReq {
                                    stream_id: stream_id.clone(),
                                    user_id,
                                    order_type,
                                    margin,
                                    asset,
                                    leverage,
                                    slippage,
                                    is_leveraged,
                                },
                                tx_res_clone.clone(),
                            )
                            .await;
                    }
                    EngineCommand::CloseOrder {
                        stream_id,
                        user_id,
                        order_id,
                        asset,
                    } => {
                        engine
                            .close_order(
                                CloseOrderReq {
                                    stream_id: stream_id.clone(),
                                    user_id,
                                    order_id,
                                    asset,
                                },
                                tx_res_clone.clone(),
                            )
                            .await;
                    }
                }
            }
        });
    }

    tokio::spawn(async move {
        while let Some((stream_id, resp)) = rx_res.recv().await {
            println!("Response for stream {}: {:?}", stream_id, resp);
            let _: String = send_data_1
                .xadd(
                    "channel-2",
                    "*",
                    &[
                        ("res_id", stream_id.as_str()),
                        ("resp", &format!("{:?}", resp)),
                    ],
                )
                .unwrap();
        }
    });

    let mut con = client.get_async_connection().await.unwrap();
    loop {
        let opts = StreamReadOptions::default().block(0).count(1);
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
                        "balance_get_usd" => EventType::balance_get_usd,
                        "balance_get_all" => EventType::balance_get_balances,
                        _ => EventType::unknown,
                    };

                    let value_data: String = from_redis_value(value).unwrap();

                    match event_type {
                        EventType::price_updates => {
                            let parsed: Result<CryptoMap, _> = serde_json::from_str(&value_data);
                            if let Ok(crypto_map) = parsed {
                                for (symbol, crypto_info) in crypto_map {
                                    let cmd = EngineCommand::UpdatePrice {
                                        price: crypto_info.price,
                                    };
                                    match symbol.as_str() {
                                        "BTC" => tx_btc.send(cmd).await.unwrap(),
                                        "ETH" => tx_eth.send(cmd).await.unwrap(),
                                        "SOL" => tx_sol.send(cmd).await.unwrap(),
                                        _ => println!("Unknown symbol: {}", symbol),
                                    }
                                }
                            }
                        }
                        EventType::order_create => {
                            if let Ok(order_data) =
                                serde_json::from_str::<CreateOrderReq>(&value_data)
                            {
                                let cmd = EngineCommand::CreateOrder {
                                    stream_id: stream_id.id.clone(),
                                    user_id: order_data.user_id,
                                    order_type: order_data.order_type,
                                    margin: order_data.margin,
                                    asset: order_data.asset.clone(),
                                    leverage: order_data.leverage,
                                    slippage: order_data.slippage,
                                    is_leveraged: order_data.is_leveraged,
                                };
                                match order_data.asset.as_str() {
                                    "BTC" => tx_btc.send(cmd).await.unwrap(),
                                    "ETH" => tx_eth.send(cmd).await.unwrap(),
                                    "SOL" => tx_sol.send(cmd).await.unwrap(),
                                    _ => {
                                        println!(
                                            "Unknown asset for order_create: {}",
                                            order_data.asset
                                        )
                                    }
                                }
                            }
                        }
                        EventType::order_close => {
                            if let Ok(close_data) =
                                serde_json::from_str::<CloseOrderReq>(&value_data)
                            {
                                let cmd = EngineCommand::CloseOrder {
                                    stream_id: stream_id.id.clone(),
                                    user_id: close_data.user_id,
                                    asset: close_data.asset.clone(),
                                    order_id: close_data.order_id,
                                };
                                match close_data.asset.as_str() {
                                    "BTC" => tx_btc.send(cmd).await.unwrap(),
                                    "ETH" => tx_eth.send(cmd).await.unwrap(),
                                    "SOL" => tx_sol.send(cmd).await.unwrap(),
                                    _ => println!(
                                        "Unknown asset for order_close: {}",
                                        close_data.asset
                                    ),
                                }
                            }
                        }
                        EventType::balance_get_usd => {
                            #[derive(Deserialize)]
                            struct BalanceUsdReq {
                                user_id: String,
                            }
                            if let Ok(req) = serde_json::from_str::<BalanceUsdReq>(&value_data) {
                                let (resp_tx, resp_rx) = oneshot::channel();
                                let _ = balance_tx
                                    .send(BalanceManagerCommand::GetUsd {
                                        user_id: req.user_id.clone(),
                                        resp: resp_tx,
                                    })
                                    .await;

                                if let Ok(usd) = resp_rx.await {
                                    println!("balance request is coming {}", usd);

                                    let payload = balance_get_usd_resp {
                                        res: stream_id.clone().id,
                                        payload: usd { usd: usd },
                                    };

                                    let _: String = con
                                        .xadd(
                                            "channel-2",
                                            "*",
                                            &[("data", &serde_json::to_string(&payload).unwrap())],
                                        )
                                        .await
                                        .unwrap();
                                }
                            }
                        }
                        EventType::balance_get_balances => {
                            #[derive(Deserialize)]
                            struct BalanceReq {
                                user_id: String,
                            }

                            if let Ok(req) = serde_json::from_str::<BalanceReq>(&value_data) {
                                let (resp_tx, resp_rx) = oneshot::channel();

                                let _ = balance_tx
                                    .send(BalanceManagerCommand::GetBalances {
                                        user_id: req.user_id.clone(),
                                        resp: resp_tx,
                                    })
                                    .await;
                                if let Ok(balances) = resp_rx.await {
                                    let resp = balance_get_all {
                                        res: stream_id.clone().id,
                                        payload: balances,
                                    };
                                    let _: String = con
                                        .xadd(
                                            "channel-2",
                                            "*",
                                            &[("data", &serde_json::to_string(&resp).unwrap())],
                                        )
                                        .await
                                        .unwrap();
                                }
                            }
                        }
                        EventType::unknown => println!("Unknown event type"),
                    }
                }
            }
        }
    }
}
