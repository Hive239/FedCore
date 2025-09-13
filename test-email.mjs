import nodemailer from 'nodemailer';

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
    console.log('Email setup is working correctly!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('Invalid login')) {
      console.error('The app password might be incorrect.');
      console.error('Make sure the app password is entered without spaces.');
    }
  }
}

testEmail();