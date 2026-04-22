# Signapse

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

## On-Device LLM Setup

The AI model files are not included in the repo (too large for git)

Before running locally, download the model files:

1. Go to https://huggingface.co/Xenova/distilgpt2/tree/main
2. Download all `.json` files from the root into `public/_models/distilgpt2/`
3. Go to https://huggingface.co/Xenova/distilgpt2/tree/main/onnx
4. Download `model_quantized.onnx` into `public/_models/distilgpt2/onnx/`

Final structure should be:
public/\_models/distilgpt2/
├── config.json
├── tokenizer.json
├── tokenizer_config.json
├── generation_config.json
├── special_tokens_map.json
├── vocab.json
├── merges.txt
├── quantize_config.json
└── onnx/
└── model_quantized.onnx

The chat requires Google Chrome or Microsoft Edge (WebGPU).Sonnet 4.6
