
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5144;
require('dotenv').config()


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



//----------------------- users---------------------------

    app.post("/users", async (req, res) => {
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



    app.get("/user/:email" , async(req , res) => {

        const email = req.params.email

        const query = {email : email}

        const result =  await usersCollection.findOne(query)
        
        res.send(result);

        


        
    })
  





// ----------------------anoouncement--------------------

    app.get("/announcements" ,async(req , res )=>{
        const cursor = AnnounceMentCollection.find()
        const result = await cursor.toArray()
        res.send(result)
    })



// -------------------------post---------------------------


    app.get("/posts", async (req , res) => {
    
        const query = req.query
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
  



// --------------------------comments-------------------

    app.get("/comment/:title", async (req , res) => {

        const title = req.params.title
        console.log( title);

        
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

    app.put("/comment/:id", async (req , res) => {

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


    app.delete("/comment/:id", async (req , res) => {

        const id = req.params.id
        const filter = {_id : new ObjectId(id)}

        const result =await postCollection.deleteOne(filter)
        res.send(result)
    })



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
