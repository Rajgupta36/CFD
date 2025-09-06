use tokio::sync::oneshot;

use crate::types::order::{Balance, Token};
use std::collections::HashMap;

pub struct BalanceManager {
    //key userId
    balances: HashMap<String, Vec<Balance>>,
}

impl BalanceManager {
    pub fn new() -> Self {
        Self {
            balances: HashMap::new(),
        }
    }

    pub fn get(&self, user_id: String, channel: oneshot::Sender<Option<Vec<Balance>>>) {
        let data = self.balances.get(&user_id);
        channel.send(data.cloned());
    }

    pub fn get_usd(&mut self, user_id: &str, channel: oneshot::Sender<i64>) {
        let entry = self.balances.entry(user_id.to_string()).or_insert_with(|| {
            vec![Balance {
                asset: "usd".to_string(),
                token: Token {
                    balance: 1000000,
                    decimal: 4,
                },
            }]
        });

        let data = entry
            .iter()
            .find(|b| b.asset == "usd")
            .map(|b| b.token.balance)
            .unwrap_or(0);
        channel.send(data);
        return;
    }

    pub fn set_usd(&mut self, user_id: &str, amount: i64) {
        let entry = self
            .balances
            .entry(user_id.to_string())
            .or_insert_with(Vec::new);

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
    }
}
