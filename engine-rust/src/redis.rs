use crate::engine::balancemanager::{BalanceManagerCommand, run_balance_manager};
use crate::engine::order_response::GetOrderResp;
use crate::types::event::EventType;
use crate::types::order::{CloseOrderReq, CreateOrderReq, GetOrderReq};
use crate::types::response::{
    EngineResponse, OrderRes, Usd, balance_get_all, balance_get_usd_resp,
};
use crate::{engine::engine::Engine, types::order::EngineCommand};
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

    let send_data_1 = client.clone();

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
                        quantity,
                        asset,
                        leverage,
                        slippage,
                        stoploss,
                        takeprofit,
                        is_leveraged,
                    } => {
                        println!("open order");
                        engine
                            .create_order(
                                CreateOrderReq {
                                    stream_id: stream_id.clone(),
                                    user_id,
                                    order_type,
                                    quantity,
                                    asset,
                                    leverage,
                                    slippage,
                                    stoploss,
                                    takeprofit,
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
                        println!("close order");
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
                    EngineCommand::GetOrder {
                        stream_id,
                        user_id,
                        asset,
                        resp,
                    } => {
                        println!("get open orders for {}", asset);
                        engine
                            .get_open_order(
                                GetOrderReq {
                                    asset,
                                    stream_id: stream_id.clone(),
                                    user_id,
                                },
                                resp,
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
            let resp = OrderRes {
                res: stream_id.clone(),
                payload: resp,
            };
            let mut con = send_data_1.get_async_connection().await.unwrap();
            let _: String = con
                .xadd(
                    "channel-2",
                    "*",
                    &[("data", &serde_json::to_string(&resp).unwrap())],
                )
                .await
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
                        "get_order" => EventType::get_order,
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
                            println!("order coming");
                            println!("{:?}", value_data);
                            if let Ok(order_data) =
                                serde_json::from_str::<CreateOrderReq>(&value_data)
                            {
                                println!("order serialized {:?}", order_data);
                                let cmd = EngineCommand::CreateOrder {
                                    stream_id: stream_id.id.clone(),
                                    user_id: order_data.user_id,
                                    order_type: order_data.order_type,
                                    quantity: order_data.quantity,
                                    asset: order_data.asset.clone(),
                                    leverage: order_data.leverage,
                                    slippage: order_data.slippage,
                                    stoploss: order_data.stoploss,
                                    takeprofit: order_data.takeprofit,
                                    is_leveraged: order_data.is_leveraged,
                                };
                                match order_data.asset.as_str() {
                                    "BTC" => tx_btc.send(cmd).await.unwrap(),
                                    "ETH" => tx_eth.send(cmd).await.unwrap(),
                                    "SOL" => tx_sol.send(cmd).await.unwrap(),
                                    _ => {
                                        println!(
                                            "unknown asset for order_create: {}",
                                            order_data.asset
                                        )
                                    }
                                }
                            }
                        }
                        EventType::order_close => {
                            print!("close order");
                            if let Ok(close_data) =
                                serde_json::from_str::<CloseOrderReq>(&value_data)
                            {
                                print!("processing order");
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
                        EventType::get_order => {
                            if let Ok(order_data) = serde_json::from_str::<GetOrderReq>(&value_data)
                            {
                                let mut responses = Vec::new();

                                for (asset, tx) in
                                    [("BTC", &tx_btc), ("ETH", &tx_eth), ("SOL", &tx_sol)]
                                {
                                    let (resp_tx, resp_rx) = oneshot::channel();

                                    let cmd = EngineCommand::GetOrder {
                                        stream_id: stream_id.id.clone(),
                                        user_id: order_data.user_id.clone(),
                                        asset: asset.to_string(),
                                        resp: resp_tx,
                                    };

                                    tx.send(cmd).await.unwrap();

                                    if let Ok(engine_resp) = resp_rx.await {
                                        match engine_resp {
                                            EngineResponse::GetOrder(get_order_resp) => {
                                                responses.push(get_order_resp);
                                            }
                                            _ => {}
                                        }
                                    }
                                }

                                let combined_orders: Vec<_> = responses
                                    .into_iter()
                                    .filter_map(|r| match r {
                                        GetOrderResp::Success { orders, .. } => Some(orders),
                                        _ => None,
                                    })
                                    .flatten()
                                    .collect();

                                let resp = OrderRes {
                                    res: stream_id.id.clone(),
                                    payload: EngineResponse::GetOrder(GetOrderResp::Success {
                                        msg: "aggregated orders".to_string(),
                                        orders: combined_orders,
                                    }),
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
                                        payload: Usd { usd: usd },
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
