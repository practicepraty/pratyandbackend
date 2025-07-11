

import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
  // For development, you can use Gmail or any SMTP service
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken, userName) => {
  try {
    const transporter = createTransporter();
    
    // Create reset URL
    const resetURL = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    // Email template
    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'Doctor Website Builder'}" <${process.env.FROM_EMAIL || process.env.SMTP_EMAIL}>`,
      to: email,
      subject: 'Password Reset Request - Doctor Website Builder',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">Password Reset Request</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Hello Dr. ${userName},
            </p>
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              We received a request to reset your password for your Doctor Website Builder account.
            </p>
            <div style="margin: 30px 0;">
              <a href="${resetURL}" 
                 style="background-color: #3498db; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; font-weight: bold; 
                        display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #777; font-size: 14px;">
              This link will expire in 15 minutes for security reasons.
            </p>
            <p style="color: #777; font-size: 14px;">
              If you didn't request this password reset, please ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetURL}" style="color: #3498db; word-break: break-all;">${resetURL}</a>
            </p>
          </div>
        </div>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send password reset email');
  }
};

// Send password reset confirmation email
export const sendPasswordResetConfirmationEmail = async (email, userName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'Doctor Website Builder'}" <${process.env.FROM_EMAIL || process.env.SMTP_EMAIL}>`,
      to: email,
      subject: 'Password Reset Successful - Doctor Website Builder',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h2 style="color: #27ae60; margin-bottom: 20px;">Password Reset Successful</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Hello Dr. ${userName},
            </p>
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Your password has been successfully reset. You can now log in with your new password.
            </p>
            <p style="color: #777; font-size: 14px; margin-top: 30px;">
              If you didn't make this change, please contact support immediately.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Confirmation email sending error:', error);
    // Don't throw error for confirmation email failure
    return false;
  }
};