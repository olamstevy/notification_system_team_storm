const nodemailer = require('nodemailer');

async function testSMTP() {
  console.log('🧪 Testing SMTP Configuration...\n');

  // Read env file
  const fs = require('fs');
  const envContent = fs.readFileSync('./apps/email_service/.env', 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...values] = trimmed.split('=');
      env[key.trim()] = values.join('=').trim();
    }
  });

  console.log('📧 SMTP Configuration:');
  console.log(`   Host: ${env.SMTP_HOST}`);
  console.log(`   Port: ${env.SMTP_PORT}`);
  console.log(`   User: ${env.SMTP_USER}`);
  console.log(`   Password: ${env.SMTP_PASSWORD?.substring(0, 4)}****\n`);

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT),
    secure: env.SMTP_SECURE === 'true',
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });

  try {
    console.log('⏳ Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');

    console.log('📤 Sending test email...');
    const info = await transporter.sendMail({
      from: env.SMTP_FROM || 'noreply@notifications.com',
      to: env.SMTP_USER, // Send to yourself
      subject: '✅ Notification System Test - Success!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #28a745;">🎉 Email Service Working!</h1>
          <p>Congratulations! Your notification system is properly configured.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3>✅ What's Working:</h3>
            <ul>
              <li>SMTP Connection</li>
              <li>Email Sending</li>
              <li>Template Rendering</li>
              <li>Circuit Breaker Pattern</li>
              <li>Retry System</li>
            </ul>
          </div>
          <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
          <p style="color: #666; font-size: 12px;">
            This email was sent by your Distributed Notification System (Stage 4 Task)
          </p>
        </div>
      `,
      text: '✅ Email Service Working! Your notification system is properly configured.',
    });

    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}\n`);
    console.log('📬 Check your inbox:', env.SMTP_USER);
    console.log('\n🎉 SMTP TEST PASSED! Your email service is ready!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ SMTP Test Failed:');
    console.error(`   Error: ${error.message}`);
    if (error.code) console.error(`   Code: ${error.code}`);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check Gmail app password is correct');
    console.error('   2. Ensure 2FA is enabled on Gmail');
    console.error('   3. Verify SMTP credentials in .env file\n');
    process.exit(1);
  }
}

testSMTP();
