const express = require("express");
const productRouter = express.Router();
const auth = require("../middlewares/auth.js");
const { Product } = require("../models/product.js");

productRouter.get("/api/products/", auth, async (req, res) => {
  try {
    const products = await Product.find({ category: req.query.category });
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// create a get request to search products and get them
// /api/products/search/i
productRouter.get("/api/products/search/:name", auth, async (req, res) => {
  try {
    const {name} = req.params;
    const products = await Product.find({
      name: { $regex: req.params.name, $options: "i" },
    });

    return res.json(products);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// create a post request route to rate the product.
productRouter.post("/api/rate-product", auth, async (req, res) => {
  try {
    const { id, rating } = req.body;
    let product = await Product.findById(id);

    for (let i = 0; i < product.ratings.length; i++) {
      if (product.ratings[i].userId == req.user) {
        product.ratings.splice(i, 1);
        break;
      }
    }

    const ratingSchema = {
      userId: req.user,
      rating,
    };

    product.ratings.push(ratingSchema);
    product = await product.save();
    return res.json(product);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

productRouter.get("/api/deal-of-day", auth, async (req, res) => {
  try {
    let products = await Product.find({});

    products = products.sort((a, b) => {
      let aSum = 0;
      let bSum = 0;

      for (let i = 0; i < a.ratings.length; i++) {
        aSum += a.ratings[i].rating;
      }

      for (let i = 0; i < b.ratings.length; i++) {
        bSum += b.ratings[i].rating;
      }
      return aSum < bSum ? 1 : -1;
    });

    return res.json(products[0]);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// app.get('/lawyers', async (req, res) => {
//   const { latitude, longitude, category, page = 1, limit = 10 } = req.query;

//   // Validate latitude and longitude
//   if (!latitude || !longitude) {
//     return res.status(400).json({ error: 'Latitude and longitude are required.' });
//   }

//   if (isNaN(latitude) || isNaN(longitude)) {
//     return res.status(400).json({ error: 'Latitude and longitude must be valid numbers.' });
//   }

//   // Validate category
//   if (!category) {
//     return res.status(400).json({ error: 'Category is required.' });
//   }

//   // Convert latitude and longitude to numbers
//   const lat = parseFloat(latitude);
//   const lng = parseFloat(longitude);
//   const limitNum = parseInt(limit, 10);
//   const pageNum = parseInt(page, 10);

//   if (limitNum < 1 || pageNum < 1) {
//     return res.status(400).json({ error: 'Page and limit must be greater than 0.' });
//   }

//   try {
//     const lawyers = await LawyerModel.aggregate([
//       {
//         $geoNear: {
//           near: {
//             type: 'Point',
//             coordinates: [lng, lat], // Order: [longitude, latitude]
//           },
//           distanceField: 'dist.calculated',
//           maxDistance: 5000, // Adjust as needed
//           spherical: true,
//         },
//       },
//       {
//         $match: { services: category },
//       },
//       {
//         $sort: { rank: 1 }, // Sort by rank in ascending order (1 for ascending, -1 for descending)
//       },
//       {
//         $skip: (pageNum - 1) * limitNum, // Skip to the requested page
//       },
//       {
//         $limit: limitNum, // Limit the number of results
//       },
//     ]);

//     res.json(lawyers);
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// });

module.exports = productRouter;

// Total sales according to category

// db.sales.aggregate([
//   {
//     $group: {
//       _id: "$product",            // Group by product
//       totalSales: { $sum: "$amount" } // Calculate total sales for each product
//     }
//   },
//   {
//     $sort: { totalSales: -1 } // Sort products by total sales in descending order
//   }
// ]);


// const redis = require('redis');
// const redisClient = redis.createClient();
// redisClient.connect(); // Connect to Redis server

// Utility function to get cached data
// const getCache = async (key) => {
//   try {
//     const data = await redisClient.get(key);
//     return data ? JSON.parse(data) : null;
//   } catch (error) {
//     console.error('Error getting data from Redis', error);
//   }
// };

// // Utility function to set data in Redis with an expiration time (e.g., 1 hour)
// const setCache = async (key, value, expiration = 3600) => {
//   try {
//     await redisClient.set(key, JSON.stringify(value), 'EX', expiration); // Set with expiry
//   } catch (error) {
//     console.error('Error setting data to Redis', error);
//   }
// };



// const user = {
//   name: 'John Doe',
//   age: 30
// };


// // Convert the JavaScript object to a JSON string
// const jsonString = JSON.stringify(user);

// fetch('https://api.example.com/users', {
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/json',
//   },
//   body: jsonString // Send the JSON string in the request body
// })
// .then(response => response.json())
// .then(data => console.log(data))
// .catch(error => console.error('Error:', error));


// https server creation

// const http = require('http');
// const https = require('https');
// const fs = require('fs');
// const express = require('express');
// const app = express();

// // SSL options
// const options = {
//   key: fs.readFileSync('/path/to/key.pem'),
//   cert: fs.readFileSync('/path/to/cert.pem')
// };

// // HTTPS server
// https.createServer(options, app).listen(443, () => {
//   console.log('HTTPS server running on port 443');
// });

// // HTTP to HTTPS redirect
// const httpApp = express();
// httpApp.use((req, res, next) => {
//   res.redirect(`https://${req.headers.host}${req.url}`);
// });

// http.createServer(httpApp).listen(80, () => {
//   console.log('HTTP server redirecting to HTTPS');
// });


//content type for file upload

// request.headers.addAll({
//   'Content-Type': 'multipart/form-data', 
//   'x-auth-token': token,
// });


//FILTERING ON PRICE

// const express = require('express');
// const Product = require('../models/productModel'); // Assuming a Product model for MongoDB

// const router = express.Router();

// // API endpoint to search products with price filtering and pagination
// router.get('/search', async (req, res) => {
//     try {
//         const { minPrice, maxPrice, page = 1, limit = 10 } = req.query;
        
//         // Building the query object
//         let query = {};

//         // Price filtering
//         if (minPrice || maxPrice) {
//             query.price = {};
//             if (minPrice) query.price.$gte = Number(minPrice); // Greater than or equal to minPrice
//             if (maxPrice) query.price.$lte = Number(maxPrice); // Less than or equal to maxPrice
//         }

//         // Pagination logic
//         const skip = (page - 1) * limit;
//         const products = await Product.find(query)
//             .skip(skip)
//             .limit(Number(limit));

//         // Get total count for pagination metadata
//         const total = await Product.countDocuments(query);

//         // Sending the response
//         res.status(200).json({
//             products,
//             total,
//             page: Number(page),
//             totalPages: Math.ceil(total / limit),
//         });
//     } catch (error) {
//         res.status(500).json({ message: 'Server Error', error });
//     }
// });

// module.exports = router;



//sorting 

// const query = { 
//   total_cost: { $gte: 100, $lte: 500 }  // Filtering by price range
// };

// const products = await Product.find(query)
//     .sort({ total_cost: 1 })  // 1 for ascending, -1 for descending
//     .skip(skip)  // For pagination
//     .limit(Number(limit));  // Limiting the number of products per page



//Infinite Scrolling 

// import 'package:flutter/material.dart';
// import 'package:http/http.dart' as http;

// class InfiniteScrollPage extends StatefulWidget {
//   @override
//   _InfiniteScrollPageState createState() => _InfiniteScrollPageState();
// }

// class _InfiniteScrollPageState extends State<InfiniteScrollPage> {
//   List<String> items = []; // List to hold the fetched items
//   bool isLoading = false; // Track if new data is being loaded
//   int currentPage = 1; // Track the current page number
//   final int pageSize = 10; // Number of items to fetch per request
//   late ScrollController _scrollController; // Scroll controller

//   @override
//   void initState() {
//     super.initState();
//     _scrollController = ScrollController(); // Initialize the scroll controller
//     _scrollController.addListener(_onScroll); // Add scroll listener
//     fetchItems(); // Initial fetch
//   }

//   @override
//   void dispose() {
//     _scrollController.dispose(); // Dispose of the controller
//     super.dispose();
//   }

//   // Function to fetch items from the backend
//   Future<void> fetchItems() async {
//     if (isLoading) return; // Avoid multiple requests
//     setState(() {
//       isLoading = true; // Set loading state
//     });

//     // Simulate a network request
//     final response = await http.get(Uri.parse('https://your-api.com/items?page=$currentPage&size=$pageSize'));

//     if (response.statusCode == 200) {
//       List<String> newItems = List.generate(pageSize, (index) => "Item ${index + (currentPage - 1) * pageSize + 1}");
//       setState(() {
//         items.addAll(newItems); // Add new items to the list
//         currentPage++; // Increment page number for next request
//         isLoading = false; // Reset loading state
//       });
//     } else {
//       // Handle error
//       setState(() {
//         isLoading = false; // Reset loading state on error
//       });
//       throw Exception('Failed to load items');
//     }
//   }

//   // Function to detect when the user scrolls to the bottom
//   void _onScroll() {
//     if (_scrollController.position.pixels == _scrollController.position.maxScrollExtent && !isLoading) {
//       fetchItems(); // Fetch more items when reached bottom
//     }
//   }

//   @override
//   Widget build(BuildContext context) {
//     return Scaffold(
//       appBar: AppBar(title: Text('Infinite Scroll Example')),
//       body: ListView.builder(
//         controller: _scrollController, // Assign the controller to the ListView
//         itemCount: items.length + (isLoading ? 1 : 0), // Add 1 for the loading indicator if loading
//         itemBuilder: (context, index) {
//           if (index == items.length) {
//             return Center(child: CircularProgressIndicator()); // Show loading indicator
//           }
//           return ListTile(title: Text(items[index]));
//         },
//       ),
//     );
//   }
// }

// void main() => runApp(MaterialApp(home: InfiniteScrollPage()));




//ScrollController


// import 'package:flutter/material.dart';
// import 'package:http/http.dart' as http;

// class InfiniteScrollPage extends StatefulWidget {
//   @override
//   _InfiniteScrollPageState createState() => _InfiniteScrollPageState();
// }

// class _InfiniteScrollPageState extends State<InfiniteScrollPage> {
//   List<String> items = []; // List to hold the fetched items
//   bool isLoading = false; // Track if new data is being loaded
//   int currentPage = 1; // Track the current page number
//   final int pageSize = 10; // Number of items to fetch per request
//   late ScrollController _scrollController; // Scroll controller

//   @override
//   void initState() {
//     super.initState();
//     _scrollController = ScrollController(); // Initialize the scroll controller
//     _scrollController.addListener(_onScroll); // Add scroll listener
//     fetchItems(); // Initial fetch
//   }

//   @override
//   void dispose() {
//     _scrollController.dispose(); // Dispose of the controller
//     super.dispose();
//   }

//   // Function to fetch items from the backend
//   Future<void> fetchItems() async {
//     if (isLoading) return; // Avoid multiple requests
//     setState(() {
//       isLoading = true; // Set loading state
//     });

//     // Simulate a network request
//     final response = await http.get(Uri.parse('https://your-api.com/items?page=$currentPage&size=$pageSize'));

//     if (response.statusCode == 200) {
//       List<String> newItems = List.generate(pageSize, (index) => "Item ${index + (currentPage - 1) * pageSize + 1}");
//       setState(() {
//         items.addAll(newItems); // Add new items to the list
//         currentPage++; // Increment page number for next request
//         isLoading = false; // Reset loading state
//       });
//     } else {
//       // Handle error
//       setState(() {
//         isLoading = false; // Reset loading state on error
//       });
//       throw Exception('Failed to load items');
//     }
//   }

//   // Function to detect when the user scrolls to the bottom
//   void _onScroll() {
//     if (_scrollController.position.pixels == _scrollController.position.maxScrollExtent && !isLoading) {
//       fetchItems(); // Fetch more items when reached bottom
//     }
//   }

//   @override
//   Widget build(BuildContext context) {
//     return Scaffold(
//       appBar: AppBar(title: Text('Infinite Scroll Example')),
//       body: ListView.builder(
//         controller: _scrollController, // Assign the controller to the ListView
//         itemCount: items.length + (isLoading ? 1 : 0), // Add 1 for the loading indicator if loading
//         itemBuilder: (context, index) {
//           if (index == items.length) {
//             return Center(child: CircularProgressIndicator()); // Show loading indicator
//           }
//           return ListTile(title: Text(items[index]));
//         },
//       ),
//     );
//   }
// }

// void main() => runApp(MaterialApp(home: InfiniteScrollPage()));

//URL Components

// Components of the URL
// req.headers.host:

// This part retrieves the host information from the request headers.
// It usually includes the domain name and, if applicable, the port number.
// Example: For a request made to http://example.com:3000, req.headers.host would return example.com:3000.

// req.url:

// This property returns the URL path of the request, including the query string if present.
// It typically includes everything after the domain name (and port).
// Example: For the URL http://example.com:3000/path/to/resource?query=param, req.url would return /path/to/resource?query=param.
// Constructing the Full URL

// For the full URL http://example.com:3000/path/to/resource?query=param, the breakdown is:

// Protocol: http://
// Host: example.com:3000
// Path: /path/to/resource
// Query String: ?query=param


