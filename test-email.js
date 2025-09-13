const nodemailer = require('nodemailer');

async function testEmail() {
  try {
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: 'meridiancontracting@gmail.com',
        pass: 'lisndcdfjjbtppai'
      }
    });

    console.log('Testing Gmail connection...');
    await transporter.verify();
    console.log('✅ Gmail connection successful!');
    
    // Try sending a test email
    const info = await transporter.sendMail({
      from: '"Test" <meridiancontracting@gmail.com>',
      to: 'test@example.com',
      subject: 'Test Email',
      text: 'This is a test email'
    });
    
    console.log('Test email would be sent with ID:', info.messageId);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('Invalid login')) {
      console.error('The app password might be incorrect or the spaces need to be included.');
      console.error('Try with spaces: "lisn dcdf jjbt ppai"');
    }
  }
}

testEmail();