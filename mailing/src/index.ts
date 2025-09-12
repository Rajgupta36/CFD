import Redis from "ioredis";
import { OrderRes, CloseOrderResp } from "./types.js";
import { saveClosedTrade } from "./database.js";
import { sendTradeNotification } from "./mailService.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

class TradeNotificationService {
  private redis: Redis;
  private offset: string = "$";

  constructor() {
    this.redis = new Redis(REDIS_URL);
    console.log("🚀 Trade Notification Service initialized");
  }

  async start() {
    console.log("📡 Starting to listen for closed trades on channel-2...");
    
    while (true) {
      try {
        // Read from Redis stream channel-2
        const response = await this.redis.xread(
          "BLOCK", 0,
          "COUNT", 1,
          "STREAMS", "channel-2", this.offset
        );

        if (response && response.length > 0) {
          const [streamName, messages] = response[0];
          
          for (const [messageId, fields] of messages) {
            this.offset = messageId;
            
            // Process each field in the message
            for (let i = 0; i < fields.length; i += 2) {
              const fieldName = fields[i];
              const fieldValue = fields[i + 1];
              
              if (fieldName === "data") {
                await this.processMessage(fieldValue);
              }
            }
          }
        }
      } catch (error) {
        console.error("❌ Error reading from Redis stream:", error);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  private async processMessage(data: string) {
    try {
      const orderRes: OrderRes = JSON.parse(data);
      
      // Check if this is a CloseOrder response
      if (orderRes.payload && orderRes.payload.CloseOrder) {
        const closeOrderResp = orderRes.payload.CloseOrder as CloseOrderResp;
        
        // Only process successful close orders
        if (closeOrderResp.status === "Success" && closeOrderResp.details && 'order' in closeOrderResp.details) {
          const order = closeOrderResp.details.order!;
          
          console.log(`📈 Processing closed trade for user ${order.user_id}, asset ${order.asset}`);
          
          // Save to database
          const saveSuccess = await saveClosedTrade(order);
          
          // Send email notification
          const emailSuccess = await sendTradeNotification(order);
          
          if (saveSuccess && emailSuccess) {
            console.log(`✅ Successfully processed closed trade ${order.order_id}`);
          } else {
            console.log(`⚠️ Partial success for trade ${order.order_id} - Save: ${saveSuccess}, Email: ${emailSuccess}`);
          }
        } else if (closeOrderResp.status === "Error") {
          console.log(`❌ Close order error: ${JSON.stringify(closeOrderResp.details)}`);
        }
      } else {
        // Log other types of messages for debugging
        console.log(`🔍 Received non-close-order message: ${JSON.stringify(orderRes.payload)}`);
      }
    } catch (error) {
      console.error("❌ Error processing message:", error);
      console.error("Raw data:", data);
    }
  }

  async stop() {
    console.log("🛑 Stopping Trade Notification Service...");
    await this.redis.disconnect();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the service
const service = new TradeNotificationService();
service.start().catch(error => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
