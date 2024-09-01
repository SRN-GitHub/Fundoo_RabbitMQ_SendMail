import dotenv from 'dotenv';
import amqp from 'amqplib';
import nodemailer from 'nodemailer';

dotenv.config();

export const getMessage = async () => {
  try {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();
    const queue = 'SendEmailQueue';

    await channel.assertQueue(queue, {
      durable: true,
    });

    console.log(`Waiting for messages in ${queue}. To exit press CTRL+C`);

    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        const emailDetails = JSON.parse(msg.content.toString());

        console.log('Received email details:', emailDetails);

        if (!emailDetails.to) {
          console.error('Missing "to" field:', emailDetails);
        }
        if (!emailDetails.subject) {
          console.error('Missing "subject" field:', emailDetails);
        }
        if (!emailDetails.text) {
          console.error('Missing "text" field:', emailDetails);
        }

        if (!emailDetails.to || !emailDetails.subject || !emailDetails.text) {
          console.error('Missing required email fields:', emailDetails);
          channel.nack(msg, false, false);
          return;
        }

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD,
          },
        });

        const mailOptions = {
          from: process.env.EMAIL,
          to: emailDetails.to,
          subject: emailDetails.subject || 'No Subject',
          text: emailDetails.text || 'No content',
        };

        console.log('Mail options:', mailOptions);

        try {
          await transporter.sendMail(mailOptions);
          console.log(`Email sent to ${emailDetails.to}`);
          channel.ack(msg);
        } catch (error) {
          console.error('Error sending email:', error);
          channel.nack(msg, false, false);
        }
      }
    });
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error);
  }
};

getMessage();
