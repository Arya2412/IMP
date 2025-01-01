//NOdemailer

const nodemailer = require('nodemailer');
const crypto = require('crypto');  // For generating random verification code
const User = require('./models/User');  // Assuming you have a User model

// Function to send verification email
async function sendVerificationCode(req, res) {
    const { email } = req.body;

    // Check if user exists in the database
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({ message: "User not found" });
    }

    // Generate a random verification code
    const verificationCode = crypto.randomBytes(3).toString('hex'); // 6-character code
    const expiry = Date.now() + 3600000; // Code expires in 1 hour

    // Save the verification code and expiry in the user's document
    user.resetPasswordcode = verificationCode;
    user.resetPasswordExpires = expiry;
    await user.save();

    // Send email with nodemailer
    const transporter = nodemailer.createTransport({
        service: 'Gmail', // Use your email service
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD,
            //Enabel 2step verification, then create app password under app password option
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USERNAME,
        to: user.email,
        subject: 'Password Reset Verification Code',
        text: `Your verification code is ${verificationCode}. This code is valid for 1 hour.`,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Verification code sent" });
    } catch (error) {
        res.status(500).json({ message: "Failed to send verification code", error });
    }
}

//reset password

// Function to reset the password
async function resetPassword(req, res) {
    const { email, code, newPassword } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
        return res.status(400).json({ message: "User not found" });
    }

    // Verify the code again before resetting the password
    if (user.resetPasswordToken === code && user.resetPasswordExpires > Date.now()) {
        // Reset the password
        user.password = newPassword;  // Ensure to hash the password using bcryptjs or similar
        user.resetPasswordToken = undefined;  // Invalidate the reset token
        user.resetPasswordExpires = undefined;  // Clear the expiry time

        await user.save();
        return res.status(200).json({ message: "Password reset successful" });
    } else {
        return res.status(400).json({ message: "Invalid or expired code" });
    }
}


//Ratelimit

const rateLimit = require('express-rate-limit');

// Create a rate limiter for password reset requests
const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per `window` (here, per 15 minutes)
    message: "Too many password reset attempts from this IP, please try again after 15 minutes",
});

// Apply the rate limiter to your password reset route
app.post('/forgot-password', resetPasswordLimiter, sendVerificationCode);


//3-4 upcoming appointments

const express = require('express');
//const router = express.Router();  
const Appointment = require('../models/appointment');
const authMiddleware = require('../middleware/authMiddleware'); 

const moment = require('moment'); // Use moment.js for easier date and time handling

router.get('/upcoming-appointments', authMiddleware, async (req, res) => {
    try {
        
        const userId = req.user._id; // Assuming the user's ID is available in req.user from the auth middleware

        const currentDateTime = new Date(); // Current date and time

        // Calculate the start and end of today
        const startOfToday = new Date(currentDateTime.setHours(0, 0, 0, 0));
        const endOfToday = new Date(currentDateTime.setHours(23, 59, 59, 999));
        const currentTime = moment(currentDateTime).format('HH:mm'); // Current time in HH:mm format

        // Fetch the next 4 upcoming appointments for the user, excluding expired time slots
        const upcomingAppointments = await Appointment.find({
            userId: userId,
            status: 'booked',
            $or: [
                { 
                    appointmentDate: { $gt: endOfToday } // Future dates
                },
                { 
                    appointmentDate: { $gte: startOfToday, $lte: endOfToday }, // Today's appointments
                    timeSlot: { $gte: currentTime } // Time slot not yet passed
                }
            ]
        })
        .sort({ appointmentDate: 1, timeSlot: 1 }) // Sort by date and time slot
        .limit(4);  // Limit to 4 appointments

        // Return the upcoming appointments
        return res.status(200).json(upcomingAppointments);
    } catch (error) {
        console.error("Error fetching upcoming appointments:", error);
        return res.status(500).json({ message: "Server error while fetching appointments" });
    }
});


//Populate

const mongoose = require('mongoose');

// Function to get appointments with populated user details
async function getAppointmentsWithUserDetails() {
    try {
        const appointments = await Appointment.find()
            .populate('userId') // This replaces userId ObjectId with the corresponding User document
            .exec();

        console.log(appointments); // Each appointment will now include user details
    } catch (error) {
        console.error("Error fetching appointments:", error);
    }
}

//Search Lawyer

const express = require('express');
//const router = express.Router();
const Lawyer = require('../models/lawyer'); // Import the Lawyer model

// Search for lawyers by name
router.get('/search-lawyers', async (req, res) => {
    const { name } = req.query; // Get the name parameter from the query string

    try {
        // Check if name is provided
        if (!name) {
            return res.status(400).json({ message: "Name query parameter is required." });
        }

        // Perform a case-insensitive search for lawyers whose name contains the search text
        const lawyers = await Lawyer.find({
            name: { $regex: name, $options: 'i' } // 'i' for case-insensitive
        });

        // Return the matching lawyers
        return res.status(200).json(lawyers);
    } catch (error) {
        console.error("Error searching for lawyers:", error);
        return res.status(500).json({ message: "Server error while searching for lawyers." });
    }
});

module.exports = router;


//Top lawyers according to rating 

const express = require('express');
//const router = express.Router();
const Lawyer = require('../models/Lawyer'); // Import the Lawyer model

// Get lawyers by specialty, sorted by rating with pagination
router.get('/lawyers', auth, async (req, res) => {
    const { specialty, page = 1, limit = 10 } = req.query; // Get specialty, page, and limit from query parameters

    try {
        if (!specialty) {
            return res.status(400).json({ message: "Specialty query parameter is required." });
        }

        // Convert page and limit to numbers
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);

        // Query to find lawyers by specialty, calculate average rating, sorted by rating in descending order with pagination
        const lawyers = await Lawyer.aggregate([
            // Step 1: Filter lawyers by specialty
            { $match: { specialty: specialty } },

            // Step 2: Calculate the average rating for each lawyer
            {
                $addFields: {
                    averageRating: { $avg: '$ratings.rating' } // Calculate the average rating of the lawyer
                }
            },

            // Step 3: Sort lawyers by average rating in descending order
            { $sort: { averageRating: -1 } },

            // Step 4: Pagination - Skip and limit the number of results
            { $skip: (pageNumber - 1) * limitNumber },
            { $limit: limitNumber }
        ]);

        // Get the total count of lawyers for pagination metadata
        const totalCount = await Lawyer.countDocuments({ specialty: specialty });

        return res.status(200).json({
            totalCount, // Total number of lawyers for the specified specialty
            lawyers,    // Array of lawyers for the current page
            currentPage: pageNumber, // Current page number
            totalPages: Math.ceil(totalCount / limitNumber) // Total pages based on the limit
        });
    } catch (error) {
        console.error("Error fetching lawyers:", error);
        return res.status(500).json({ message: "Server error while fetching lawyers." });
    }
});

module.exports = router;

//Email on canceling Scheduled meeting

const nodemailer = require('nodemailer');

// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // or your email service provider
    auth: {
        user: 'your-email@gmail.com',
        pass: 'your-email-password',
    },
});

// Endpoint to cancel an appointment
router.post('/cancel-appointment', auth , async (req, res) => {
    const { appointmentId } = req.body;

    try {
        const appointment = await Appointment.findById(appointmentId).populate('userId');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Update the appointment status to 'canceled'
        appointment.status = 'canceled';
        await appointment.save();

        // Send email notification to the user
        const mailOptions = {
            from: 'your-email@gmail.com',
            to: appointment.userId.email,
            subject: 'Appointment Canceled',
            text: `Dear User,\n\nThe appointment scheduled with your lawyer has been canceled.\n\nBest Regards,\nNyaya App Team`,
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({ message: 'Appointment canceled and user notified' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
});
 

// On clicking timeslot

router.post('/reserve-slot', async (req, res) => {
    const { lawyerId, userId, date, timeSlot } = req.body;

    try {
        // Check if the slot is already booked or pending for that lawyer
        const existingAppointment = await Appointment.findOne({
            lawyerId,
            date,
            timeSlot,
            status: { $in: ['pending', 'Booked'] }
        });

        if (existingAppointment) {
            return res.status(400).json({ message: 'Slot is already reserved or booked' });
        }

        // Reserve the slot temporarily (pending)
        const reservationExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

        const newAppointment = new Appointment({
            lawyerId,
            userId,
            date,
            timeSlot,
            reservationExpiry,
            status: 'pending',
            paymentStatus:'pending'
        });

        await newAppointment.save();

        return res.status(200).json({ message: 'Slot reserved', appointmentId: newAppointment._id });
    } catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
});

//Payment Methods

import 'package:upi_india/upi_india.dart';

// Future<void> initiatePayment(String upiId, String name, String amount) async {
//   UpiIndia upiIndia = UpiIndia();
//   UpiResponse response = await upiIndia.startTransaction(
//     app: UpiApp.googlePay, // or any UPI app
//     receiverUpiId: upiId,
//     receiverName: name,
//     transactionRefId: 'TxnRef12345',
//     transactionNote: 'Booking Payment',
//     amount: double.parse(amount),
//   );

//   handlePaymentResponse(response);
// }

// void handlePaymentResponse(UpiResponse response) {
//     if (response.status == UpiPaymentStatus.success) {
//       // Payment is successful, confirm the slot on the backend
//       confirmSlot(appointmentId);
//     } else {
//       // Payment failed, release the slot
//       releaseSlot(appointmentId);
//     }
//   }

// Confirm the slot after successful payment
router.post('/confirm-slot', async (req, res) => {
    const { appointmentId } = req.body;

    try {
        const appointment = await Appointment.findById(appointmentId);

        if (!appointment || appointment.status !== 'pending') {
            return res.status(400).json({ message: 'Invalid appointment or already processed' });
        }

        // Confirm the slot
        appointment.status = 'booked';
        appointment.paymentStatus = 'success';
        appointment.reservationExpiry = null; // Clear reservation expiry
        await appointment.save();

        res.status(200).json({ message: 'Slot confirmed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

  
//frequent check for expired appointments

const express = require('express');
const mongoose = require('mongoose');
const Appointment = require('./models/Appointment'); // Import the Appointment model
const app = express();

const releaseExpiredSlots = async () => {
    try {
        const now = Date.now();
        const expiredAppointments = await Appointment.find({ 
            status: 'pending',
            reservationExpiry: { $lte: now }
        });

        expiredAppointments.forEach(async (appointment) => {
            appointment.status = 'available'; // Mark the slot as available
            appointment.reservationExpiry = null; // Clear reservation expiry
            await appointment.save();
        });

        console.log('Expired slots released');
    } catch (error) {
        console.error('Error releasing expired slots:', error);
    }
};

// Set the interval to check for expired slots every minute
setInterval(releaseExpiredSlots, 60 * 1000); // 1 minute interval

// Connect to MongoDB and start the server
mongoose.connect('mongodb://localhost:27017/your-db-name', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    app.listen(3000, () => {
        console.log('Server is running on port 3000');
    });
}).catch(err => {
    console.error('Error connecting to the database:', err);
});


//Free Slots to show on screen

const express = require('express');
const router = express.Router();
const Appointment = require('../models/appointment'); // Adjust path to your model

// Default time slots (can be adjusted as per your need)
const defaultTimeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
];

// Route to fetch available time slots
router.get('/available-slots/:lawyerId/:date', async (req, res) => {
    const { lawyerId, date } = req.params;

    try {
        // Find appointments for the specified lawyer and date, excluding canceled bookings
        const bookedSlots = await Appointment.find({
            lawyerId: lawyerId,
            date: date,
            $or: [{ paymentStatus: 'pending' }, { paymentStatus: 'success' }],
            appointmentStatus: { $ne: ['canceled' ,'available']},
        }, 'timeSlot'); // Only return the timeSlot field

        // Extract booked time slots
        const bookedTimeSlotList = bookedSlots.map(slot => slot.timeSlot);

        // Filter out booked slots from the default time slots
        const availableTimeSlots = defaultTimeSlots.filter(slot => !bookedTimeSlotList.includes(slot));

        // Send the available slots back to the frontend
        res.status(200).json(availableTimeSlots);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching available slots', error });
    }
});

module.exports = router;

//finding review for perticular appointId

const lawyerWithReview = await Lawyer.findOne(
    { "reviews.appointmentId": appointmentId },
    { "reviews.$": 1 } // Return only the matched review
);

//Displaying random Articles

const randomArticles = await Article.aggregate([
    { $sample: { size: 10 } }, // Randomly pick 10 articles
  ]);
  

//2 3 7 9 1


