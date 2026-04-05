const nodemailer = require("nodemailer");
const { Feedback } = require("../models");

// Cấu hình transporter cho nodemailer
//LƯU Ý: Người dùng cần cấu hình EMAIL_USER và EMAIL_PASS trong file .env
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true cho cổng 465, false cho các cổng khác (như 587)
  connectionTimeout: 10000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  },
  family: 4 // Bắt buộc dùng IPv4 để tránh lỗi ESOCKET ở một số mạng
});

// Kiểm tra kết nối khi khởi động
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter.verify((error, success) => {
    if (error) {
      console.error(">>> LỖI KẾT NỐI EMAIL (SMTP):", error.message);
      console.error("Vui lòng kiểm tra lại EMAIL_USER và EMAIL_PASS (nên dùng App Password).");
    } else {
      console.log(">>> KẾT NỐI EMAIL (SMTP) THÀNH CÔNG! Sẵn sàng gửi góp ý.");
    }
  });
}

exports.sendFeedback = async ({ subject, content, userId }) => {
  // 1. Lưu vào database
  const feedback = await Feedback.create({
    user_id: userId,
    subject,
    content,
  });

  // 2. Nội dung email HTML - Giao diện Premium
  const htmlContent = `
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1f36; max-width: 600px; margin: 20px auto; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #e3e8ee;">
      <!-- Header với Gradient -->
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 40px 20px; text-align: center;">
        <div style="background: rgba(255,255,255,0.2); width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; font-size: 30px;">✉️</div>
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Phản Hồi Mới</h1>
        <p style="margin: 8px 0 0; opacity: 0.9; font-size: 15px;">Hệ thống Board Game Platform</p>
      </div>

      <div style="padding: 32px; background-color: #ffffff;">
        <!-- Subject Section -->
        <div style="margin-bottom: 28px;">
          <p style="margin: 0 0 8px; font-size: 12px; color: #697386; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Chủ đề góp ý</p>
          <h2 style="margin: 0; font-size: 20px; color: #1a1f36; font-weight: 700;">${subject}</h2>
        </div>
        
        <!-- Content Section -->
        <div style="margin-bottom: 32px;">
          <p style="margin: 0 0 8px; font-size: 12px; color: #697386; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Nội dung chi tiết</p>
          <div style="padding: 20px; background-color: #f7fafc; border: 1px solid #e3e8ee; border-radius: 12px; color: #3c4257; font-size: 16px; min-height: 100px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02); line-height: 1.8;">${content}</div>
        </div>
        
        <!-- Người gửi Card -->
        <div style="padding: 24px; background: #ffffff; border: 1px solid #e3e8ee; border-radius: 12px; box-shadow: 0 4px 6px rgba(50, 50, 93, 0.11), 0 1px 3px rgba(0, 0, 0, 0.08);">
          <p style="margin: 0 0 16px; font-size: 12px; color: #697386; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Thông tin người gửi</p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="60" valign="middle">
                <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 50%; text-align: center; line-height: 50px; font-size: 22px; color: white; font-weight: 800;">
                  ${userId ? '👤' : '👤'}
                </div>
              </td>
              <td valign="middle" style="padding-left: 14px;">
                <p style="margin: 0; font-size: 16px; color: #1a1f36; font-weight: 700; line-height: 1.4;">
                  ${userId ? `Người dùng ID: ${userId}` : 'Khách vãng lai (Ẩn danh)'}
                </p>
                <p style="margin: 4px 0 0; font-size: 13px; color: #697386;">
                  🕐 Gửi lúc: ${new Date().toLocaleString('vi-VN')}
                </p>
              </td>
            </tr>
          </table>
        </div>

        <!-- Action Button -->
        <div style="margin-top: 40px; text-align: center;">
          <a href="http://localhost:5173/dashboard" style="display: inline-block; padding: 14px 28px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; transition: background-color 0.2s;">Truy cập Dashboard</a>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 24px; background-color: #f7fafc; text-align: center; border-top: 1px solid #e3e8ee;">
        <p style="margin: 0; font-size: 13px; color: #697386;">&copy; 2024 Board Game Platform Team</p>
        <p style="margin: 5px 0 0; font-size: 12px; color: #a3acb9;">Đây là thông báo tự động, vui lòng không phản hồi.</p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"Board Game Feedback" <${process.env.EMAIL_USER}>`,
    to: "htrang11022004@gmail.com",
    subject: `[Feedback] ${subject}`,
    text: `Nội dung góp ý từ người dùng (ID: ${userId || 'Ẩn danh'}):\n\n${content}`,
    html: htmlContent,
  };

  let emailSent = false;
  let emailError = null;

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const info = await new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (err, info) => {
          if (err) reject(err);
          else resolve(info);
        });
      });
      console.log("Email đã được gửi:", info.response);
      emailSent = true;
    } catch (err) {
      console.error("Lỗi gửi email:", err);
      emailError = err.message;
    }
  }

  if (!emailSent && process.env.EMAIL_USER) {
    const err = new Error(`Không thể gửi email: ${emailError || 'Chưa cấu hình tài khoản'}`);
    err.statusCode = 500;
    throw err;
  }

  return {
    success: true,
    message: "Góp ý đã được gửi thành công!",
    data: feedback,
  };
};
