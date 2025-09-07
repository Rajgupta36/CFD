use crate::types::order::{Balance, Token};
use std::collections::HashMap;
use tokio::sync::{mpsc, oneshot};

pub enum BalanceManagerCommand {
    GetUsd {
        user_id: String,
        resp: oneshot::Sender<i64>,
    },
    SetUsd {
        user_id: String,
        amount: i64,
        resp: oneshot::Sender<()>,
    },
    GetBalances {
        user_id: String,
        resp: oneshot::Sender<Option<Vec<Balance>>>,
    },
}

pub async fn run_balance_manager(mut rx: mpsc::Receiver<BalanceManagerCommand>) {
    let mut balances: HashMap<String, Vec<Balance>> = HashMap::new();

    while let Some(cmd) = rx.recv().await {
        match cmd {
            BalanceManagerCommand::GetUsd { user_id, resp } => {
                let entry = balances.entry(user_id.clone()).or_insert_with(|| {
                    vec![Balance {
                        asset: "usd".to_string(),
                        token: Token {
                            balance: 1_000_000,
                            decimal: 4,
                        },
                    }]
                });
                let usd = entry
                    .iter()
                    .find(|b| b.asset == "usd")
                    .map(|b| b.token.balance)
                    .unwrap_or(0);
                let _ = resp.send(usd);
            }

            BalanceManagerCommand::SetUsd {
                user_id,
                amount,
                resp,
            } => {
                let entry = balances.entry(user_id.clone()).or_insert_with(Vec::new);
                if let Some(balance) = entry.iter_mut().find(|b| b.asset == "usd") {
                    balance.token.balance = amount;
                } else {
                    entry.push(Balance {
                        asset: "usd".to_string(),
                        token: Token {
                            balance: amount,
                            decimal: 4,
                        },
                    });
                }
                let _ = resp.send(()); // ✅ confirm update
            }

            BalanceManagerCommand::GetBalances { user_id, resp } => {
                let data = balances.get(&user_id).cloned();
                let _ = resp.send(data);
            }
        }
    }
}
