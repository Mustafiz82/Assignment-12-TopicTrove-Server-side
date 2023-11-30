
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5144;
require('dotenv').config()
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);


app.use(cors());
app.use(express.json());



app.get("/", (req, res) => {
  res.send("simple crud is running");
});


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_PASS}@cluster0.uotm6ic.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // await client.connect();

    const database = client.db("TopiceTroveDB");

    const usersCollection = database.collection("users");
    const AnnounceMentCollection = database.collection("announcements");
    const postCollection = database.collection("post");
    const commentCollection = database.collection("comment");
    const tagsCollection = database.collection("tags");
    const paymentCollection = database.collection("payment")

// ----------------------middlewere-------------------------------------


const verifyToken = (req, res, next) => {

    console.log("inside middlewere", req.headers);


    // headers is set in useaxiosSecure and in header token is in it


    // if no token found set status
    if (!req.headers.authorization) {
        return res.status(401).send({ messege: "forbidden access" });
    }


    //splitting the string to get only token not "barear"  text
    const token = req.headers.authorization.split(" ")[1];


    // verifying is the token same or not
    jwt.verify( token, process.env.ACCESS_TOKEN_SECRET,
        function (err, decoded) {
            if (err) {
                return res
                    .status(401)
                    .send({ messege: "forbidden access" });
            } else {
                // set the decoded jwt information (token , email ) in decoded file
                req.decoded = decoded;
                next();
            }
        }
    );
};


 

const verifyAdmin = async (req, res, next) => {
    // getting email form decoded which is previously set in verifytoken middleware
    // in every api where needed verifytoken must need to be  before verify admin


    const email = req.decoded.email;
    const query = { email: email };


    const user = await usersCollection.findOne(query);


    let admin = user?.role === "admin";


    if (!admin) {
        return res.status(403).send({ messege: "forbidden Access" });
    }
    next();
};

//----------------------- users---------------------------

    app.post("/users" , async (req, res) => {
        const user = req.body;
        // console.log(user.email);

        const query = {email : user.email }
        const userEmail = await usersCollection.findOne(query)
        console.log("useremail" ,userEmail);

        if(!userEmail){
            const result = await usersCollection.insertOne(user);
            res.send(result);
        }
        else{
            res.send({Message : "user already exist"})
        }
      });



    app.get("/user/:email" ,verifyToken , async(req , res) => {

        const email = req.params.email

        const query = {email : email}

        const result =  await usersCollection.findOne(query)
        
        res.send(result);


        
    })

      
    app.get("/users",verifyToken ,verifyAdmin , async (req, res) => {
      
        const cursor = usersCollection.find();
        const result = await cursor.toArray();
        res.send(result);

    });

    
    app.patch("/users/membership/:email"  ,verifyToken ,async (req , res) => {

        const email = req.params.email


        console.log(email , "email");



        const filter = {email :email}

        const options ={ upsert: true };

        const updateDoc = {
            $set: {
                Membership : "Member"
            },
        };

        // console.log("comment is ",id , updateComment);


        const result =await usersCollection.updateOne(filter , updateDoc )
        res.send(result)
    })
    
    app.patch("/users/:id"  ,verifyToken , verifyAdmin,async (req , res) => {

        const id = req.params.id


        console.log(id , "id");

        const filter = {_id : new ObjectId(id)}

        const options ={ upsert: true };

        const updateDoc = {
            $set: {
            role : "admin"
            },
        };

        // console.log("comment is ",id , updateComment);


        const result =await usersCollection.updateOne(filter , updateDoc )
        res.send(result)
    })

 

// ----------------------anoouncement--------------------

    app.get("/announcements" ,async(req , res )=>{
        const cursor = AnnounceMentCollection.find()
        const result = await cursor.toArray()
        res.send(result)
    })

    app.post("/announcements" , async (req , res) => {
        const data = req.body
        console.log(data);
        const resul = await AnnounceMentCollection.insertOne(data)
        res.send(resul)
    })



// -------------------------post---------------------------


    app.get("/posts", async (req , res) => {


    
        const query = req.query
        const size = parseInt(req.query.size );
        const page = parseInt(req.query.page  )

        console.log(size , page , "size and page ");
        const skip = page * size 
        console.log(query);
        const result = await usersCollection.aggregate([
            {
            
                $lookup: { 
                    from: "post",
                    localField:  "email",
                    foreignField: "authorEmail",
                    as: "postInfo",
                },
            },
            {
                $unwind : "$postInfo" 

            },
            {
                $addFields : {
                    popularity : {
                        $subtract : [ {$toInt :"$postInfo.upVote" } , {$toInt :"$postInfo.downVote" }]
                    }
                }
            }
            ,
            {
                $sort: {
                    "postInfo.postTimeUTC" : -1,
                }
            },
            

            {
                $project : {
                    name : 1,
                    imageUrl:1,
                    popularity : 1,
                    postInfo:1,
                    email:1
                }
            },
            { 
                $skip: skip 
            },
            {
                 $limit: size 
            },
        
        ]).toArray();

        console.log("query" ,query);

        if(query?.tag){
            const data = result.filter(item => item.postInfo.tag === query.tag)
            res.send(data)
            console.log("hello");
        }
        else if(query.email){
            const data = result.filter(item => item.email === query.email)
            res.send(data)
            console.log("result sent form emai lquer");
        }
        else{
            res.send(result)
            console.log("resul send without query");
        }

    })


    app.get("/post/:id" , async(req , res) =>{
        const id = req.params.id
        
        const result = await usersCollection.aggregate([
            {
            
                $lookup: { 
                    from: "post",
                    localField:  "email",
                    foreignField: "authorEmail",
                    as: "postInfo",
                },
            },
            {
                $unwind : "$postInfo" 

            },
            {
                $addFields : {
                    popularity : {
                        $subtract : [ {$toInt :"$postInfo.upVote" } , {$toInt :"$postInfo.downVote" }]
                    }
                }
            }
            ,
            
            

            {
                $project : {
                    name : 1,
                    imageUrl:1,
                    popularity : 1,
                    postInfo:1
                }
            },
        
        ]).toArray();

        const newData = result.find(item => item.postInfo._id == id)

        res.send(newData)

    })

    app.patch('/post/update/:id' ,async(req , res) =>{
        const id = req.params.id
        const updatePost = req.body
        console.log(id ,updatePost)
  
  
        const filter = { _id : new ObjectId(id) };
        const updateDoc = {
          $set: {
            upVote : updatePost.upvote,
            downVote : updatePost.downVote,
            // downVote: updatePost.
          },
        };
        console.log("upvote is " , updatePost.upvote);

        const result = await postCollection.updateOne(filter, updateDoc, );
        res.send(result)
  
  
      })

    app.post("/posts" , async(req , res) => {

        const postInfo = req.body

        const result = await postCollection.insertOne(postInfo)
        res.send(result)
        console.log(postInfo);
    })
    
    app.delete("/post/:id", verifyToken ,async (req , res) => {

        const id = req.params.id
        const filter = {_id : new ObjectId(id)}

        const result =await postCollection.deleteOne(filter)
        res.send(result)
    })

    app.get("/postcount/:email" , async (req , res ) => {

        const email = req.params.email
        console.log(email);
        const query = {authorEmail : email}

        const result = await postCollection.find(query).toArray()

        console.log(result.length);
        res.send({result : result.length})
    })




// --------------------------comments-------------------

    app.get("/comment/:title"  ,async (req , res) => {

        const title = req.params.title
        // console.log( title);

        
        // const query = {postTitle :  title}
        
        // const cursor = commentCollection.find(query)
        // const result = await cursor.toArray()


        
        const result = await usersCollection.aggregate([
            
            {
            
                $lookup: { 
                    from: "comment",
                    localField:  "email",
                    foreignField: "email",
                    as: "postInfo",
                },
            },
            {
                $unwind : "$postInfo" 

            },        
        

            {
                $project : {
                    name : 1,
                    imageUrl:1,
                    email :1,
                    postInfo:1
                }
            },
        
        ]).toArray();

        const filteredResult = result.filter(item => item.postInfo.postTitle === title)
        res.send(filteredResult)
        // res.send(result)
    })


    app.post("/comments" , async(req , res) => {

        const comment = req.body

        const result = await commentCollection.insertOne(comment)
        res.send(result)
        // console.log(comment);
        
    })

    app.put("/comment/:id",verifyToken, async (req , res) => {

        const id = req.params.id

        const updateComment = req.body

        const filter = {_id : new ObjectId(id)}

        const options ={ upsert: true };

        const updateDoc = {
            $set: {
            reported : updateComment.report
            },
        };

        // console.log("comment is ",id , updateComment);


        const result =await commentCollection.updateOne(filter , updateDoc , options)
        res.send(result)
    })


   
    app.delete("/comment/:id", verifyToken ,verifyAdmin ,async (req , res) => {

        const id = req.params.id
        const filter = {_id : new ObjectId(id)}

        const result =await commentCollection.deleteOne(filter)
        res.send(result)
    })


    app.get("/commentsReported" ,verifyToken ,verifyAdmin, async (req , res) => {

        
        const result = await usersCollection.aggregate([
            
            {
            
                $lookup: { 
                    from: "comment",
                    localField:  "email",
                    foreignField: "email",
                    as: "postInfo",
                },
            },
            {
                $unwind : "$postInfo" 

            }, 

            {
                 $match:
                    {
                      "postInfo.reported": { $ne: null }
                    }
            },

                    
        

            {
                $project : {
                    name : 1,
                    imageUrl:1,
                    email :1,
                    postInfo:1
                }
            },
        
        ]).toArray();
        const filteredResult = result.filter(item => item.postInfo.reported !== "undefined" )
        res.send(filteredResult)

    })


    app.get("/comments" , async(req , res) => {

        const announcmentCount = await AnnounceMentCollection.estimatedDocumentCount()
        res.send({announcmentCount})
    })

    // -------------------adminState---------------

    app.get("/adminState" ,verifyToken ,verifyAdmin, async (req , res) => {

        const postCount = await postCollection.estimatedDocumentCount()
        const userCount = await usersCollection.estimatedDocumentCount()
        const commemtCount = await commentCollection.estimatedDocumentCount()
        console.log(postCount);

        
        res.json({
            postCount,
            commemtCount,
            userCount
          });
    })


    // ----------------------tags-----------------------


    app.post("/tags",verifyToken , verifyAdmin , async (req , res) => {

        const tag = (req.body)

        console.log(tag);


        const query ={ tag : tag.tag}

        const searchTag = await tagsCollection.findOne(query)
        // console.log(searchTag.length);
        console.log(searchTag , "searchtag");

        if(!searchTag){

            const result = await tagsCollection.insertOne(tag)
            res.send(result)
        }
        else {
            res.send({messeage : "tag already in the collection"})
        }


    })


    app.get("/tags" , async (req , res) => {

        const result = await tagsCollection.find().toArray()

        res.send(result)
    })



    // -------------------jwt --------------------------

    app.post("/jwt", async (req, res) => {

        const user = req.body;
        
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "1h",
        });

        console.log( "toke is token" , token);
        res.send({ token });
    });



    app.get("/users/admin/:email",  async (req, res) => {
        const email = req.params.email;


        // if (email !== req.decoded.email) {
        //     return res
        //         .status(401)
        //         .send({ messege: "unauthoroized Access" });
        // }


        const query = { email: email };


        const user = await usersCollection.findOne(query);


        let admin = false;


        if (user) {
            admin = user?.role === "admin";
        }


        res.send({ admin });
    });



//    ----------------------------stripe payment------------


app.post("/payment", async (req, res) => {
    const payment = req.body;
    const paymentResult = await paymentCollection.insertOne(payment);


    // carefully delete id's from catt






    console.log(payment);
    res.send (paymentResult)
});



app.post("/create-payment-intent", async (req, res) => {
    const { price } = req.body;
    const amount = parseInt(price * 100);
    console.log(amount);

    console.log("price of cart is ", price);

    const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
    });

    console.log("payment intent", paymentIntent.client_secret);

    res.send({
        clientSecret: paymentIntent.client_secret,
        // messege : "hello world"
    });
});




app.get("/payment/:email", verifyToken, async (req, res) => {
    const email = req.params.email;


    console.log(email, "payment");


    if (email !== req.decoded.email) {
        return res
            .status(401)
            .send({ messege: "unauthoroized Access" });
    }


    const query = { email: email };


    const Payments = await paymentCollection.find(query).toArray();


    res.send(Payments);
});





// -----------------------pagination-------------




app.get("/dataCount" , async (req , res) => {
    const count = await postCollection.estimatedDocumentCount()
    // const users = await usersCollection.estimatedDocumentCount()
    // const count = await productCollection.estimatedDocumentCount()
    console.log("api got hit");
    res.send({count})
})





app.get("/paginatePost", async (req, res) => {
    const size = parseInt(req.query.size);
    const page = parseInt(req.query.page);


    const result = await productCollection.find()
    .skip(page * size)
    .limit(size)
    .toArray();
    console.log("query of products is", req.query);

    res.send(result);
  });



    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`simple crud is running on ${port}`);
});
