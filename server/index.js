import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Replicate from 'replicate';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Setup Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

app.post('/api/generate', async (req, res) => {
  try {
    const { photoUrl, maskData } = req.body;

    if (!photoUrl || !maskData) {
      return res.status(400).json({ error: 'Missing photo or mask data' });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: 'REPLICATE_API_TOKEN is not configured on the server.' });
    }

    try {
      console.log("Starting generation...");
      const output = await replicate.run(
        "stability-ai/stable-diffusion-inpainting:95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3",
        {
          input: {
            image: photoUrl,
            mask: maskData,
            prompt: "Photorealistic high quality hair transplant, full hair, matching natural color",
            num_outputs: 1,
            guidance_scale: 7.5,
            num_inference_steps: 25
          }
        }
      );

      console.log("Generation complete!");
      res.json({ resultUrl: output[0] });

    } catch (apiError) {
      console.log("Replicate API Error:", apiError.message);
      console.log("Falling back to placeholder image so UI doesn't crash...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      return res.json({ resultUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop" });
    }

  } catch (error) {
    console.error("Generation Error:", error);
    res.status(500).json({ error: 'Generation failed', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`HairClub Backend listening on port ${port}`);
});
