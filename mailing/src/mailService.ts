import { Resend } from "resend";
import { Order } from "./types.js";
import { prisma } from "./database.js";

const MAIL_SECRET = process.env.MAIL_SECRET;
const resend = new Resend(MAIL_SECRET);

export async function sendTradeNotification(order: Order): Promise<boolean> {
  try {
    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: order.user_id },
      select: { email: true }
    });

    if (!user) {
      console.log(`User ${order.user_id} not found for email notification`);
      return false;
    }

    // Format PnL for display
    const pnlFormatted = (order.pnl / Math.pow(10, 8)).toFixed(8);
    const pnlClass = order.pnl >= 0 ? 'profit' : 'loss';
    const pnlColor = order.pnl >= 0 ? '#22c55e' : '#ef4444';

    // Format prices
    const entryPrice = (order.open_price / Math.pow(10, 8)).toFixed(8);
    const exitPrice = ((order.close_price || 0) / Math.pow(10, 8)).toFixed(8);
    const quantity = (order.quantity / Math.pow(10, 8)).toFixed(8);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🎯 Trade Closed</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your ${order.asset} position has been closed</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px;">Trade Summary</h2>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
              <div>
                <p style="margin: 0; color: #64748b; font-size: 14px;">Asset</p>
                <p style="margin: 5px 0 0 0; font-weight: bold; color: #1e293b;">${order.asset}</p>
              </div>
              <div>
                <p style="margin: 0; color: #64748b; font-size: 14px;">Type</p>
                <p style="margin: 5px 0 0 0; font-weight: bold; color: #1e293b;">${order.order_type.toUpperCase()}</p>
              </div>
              <div>
                <p style="margin: 0; color: #64748b; font-size: 14px;">Quantity</p>
                <p style="margin: 5px 0 0 0; font-weight: bold; color: #1e293b;">${quantity}</p>
              </div>
              <div>
                <p style="margin: 0; color: #64748b; font-size: 14px;">Leverage</p>
                <p style="margin: 5px 0 0 0; font-weight: bold; color: #1e293b;">${order.leverage}x</p>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
              <div>
                <p style="margin: 0; color: #64748b; font-size: 14px;">Entry Price</p>
                <p style="margin: 5px 0 0 0; font-weight: bold; color: #1e293b;">$${entryPrice}</p>
              </div>
              <div>
                <p style="margin: 0; color: #64748b; font-size: 14px;">Exit Price</p>
                <p style="margin: 5px 0 0 0; font-weight: bold; color: #1e293b;">$${exitPrice}</p>
              </div>
            </div>

            <div style="background: ${pnlColor}10; padding: 15px; border-radius: 6px; border-left: 4px solid ${pnlColor};">
              <p style="margin: 0; color: #64748b; font-size: 14px;">Profit/Loss</p>
              <p style="margin: 5px 0 0 0; font-weight: bold; color: ${pnlColor}; font-size: 18px;">
                ${order.pnl >= 0 ? '+' : ''}$${pnlFormatted}
              </p>
            </div>
          </div>

          <div style="text-align: center; color: #64748b; font-size: 12px;">
            <p style="margin: 0;">Trade closed at ${new Date().toLocaleString()}</p>
            <p style="margin: 10px 0 0 0;">Order ID: ${order.order_id}</p>
          </div>
        </div>
      </div>
    `;

    const data = await resend.emails.send({
      from: "trading@resend.dev",
      to: user.email,
      subject: `🎯 ${order.asset} Trade Closed - ${order.pnl >= 0 ? 'Profit' : 'Loss'} $${Math.abs(parseFloat(pnlFormatted))}`,
      html: emailHtml,
    });

    console.log(`Trade notification sent to: ${user.email} for order ${order.order_id}`);
    return true;
  } catch (error) {
    console.error("Error sending trade notification:", error);
    return false;
  }
}
