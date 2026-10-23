# Rendering via API

https://mediamake-mediamake.vercel.app/api/remotion/render/preset => triggers render
example inputData ( will provide detailed api in future, on how you can have different mp4 etc.. )

## Headers

```
`Authorization`: `Bearer <APIKEY>`
```

## Method

POST Request

## Body

```
{"presets":[{
"presetId": "media-track",
"presetType": "predefined",
"presetInputData":  {
    "mediaItems": {
      "items": [
        { "src": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", "type": "video" },
        { "src": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", "type": "video" }
      ]
    }
  }
}]}
```

## Progress CHeckign via API

https://mediamake-mediamake.vercel.app/api/remotion/progress?id={id}&bucketName={bucketName}
id & bucketName you will get in the first request.

## Method

GET Request

## Headers

```
`Authorization`: `Bearer <APIKEY>`
```

# Example of Output Progress Data

```
{
	"type": "done",
	"url": "https://s3.us-east-2.amazonaws.com/remotionlambda-useast2-xjv1ee2a1g/renders/ng0vstpl6e/out.mp4",
	"size": 23189419,
	"renderInfo": {
		"framesRendered": 1354,
		"bucket": "remotionlambda-useast2-xjv1ee2a1g",
		"renderSize": 23189419,
		"chunks": 68,
		"cleanup": {
			"doneIn": 0,
			"filesDeleted": 0,
			"minFilesToDelete": 0
		},
		"costs": {
			"accruedSoFar": 0.0239,
			"displayCost": "$0.024",
			"currency": "USD",
			"disclaimer": "Estimated cost for function invocations only. Does not include cost for storage and data transfer."
		},
		"currentTime": 1758921005221,
		"done": true,
		"encodingStatus": {
			"framesEncoded": 1354,
			"combinedFrames": 1354,
			"timeToCombine": 2629
		},
		"errors": [],
		"fatalErrorEncountered": false,
		"lambdasInvoked": 68,
		"outputFile": "https://s3.us-east-2.amazonaws.com/remotionlambda-useast2-xjv1ee2a1g/renders/ng0vstpl6e/out.mp4",
		"renderId": "ng0vstpl6e",
		"timeToFinish": 18908,
		"timeToFinishChunks": 12435,
		"timeToRenderFrames": 5753,
		"overallProgress": 1,
		"retriesInfo": [],
		"outKey": "renders/ng0vstpl6e/out.mp4",
		"outBucket": "remotionlambda-useast2-xjv1ee2a1g",
		"mostExpensiveFrameRanges": [
			{
				"timeInMilliseconds": 10569,
				"chunk": 7,
				"frameRange": [
					140,
					159
				]
			},
			{
				"timeInMilliseconds": 10524,
				"chunk": 29,
				"frameRange": [
					580,
					599
				]
			},
			{
				"timeInMilliseconds": 10522,
				"chunk": 52,
				"frameRange": [
					1040,
					1059
				]
			},
			{
				"timeInMilliseconds": 10311,
				"chunk": 50,
				"frameRange": [
					1000,
					1019
				]
			},
			{
				"timeInMilliseconds": 10297,
				"chunk": 10,
				"frameRange": [
					200,
					219
				]
			}
		],
		"timeToEncode": 4595,
		"outputSizeInBytes": 23189419,
		"type": "success",
		"estimatedBillingDurationInMilliseconds": 606954,
		"timeToCombine": 2629,
		"combinedFrames": 1354,
		"renderMetadata": {
			"startedDate": 1758920640258,
			"totalChunks": 68,
			"estimatedTotalLambdaInvokations": 69,
			"estimatedRenderLambdaInvokations": 68,
			"compositionId": "DataMotion",
			"siteId": "https://remotionlambda-useast2-xjv1ee2a1g.s3.us-east-2.amazonaws.com/sites/mediamake/index.html",
			"codec": "h264",
			"type": "video",
			"imageFormat": "jpeg",
			"inputProps": {
				"type": "payload",
				"payload": "{\"childrenData\":[{\"id\":\"video-scene\",\"componentId\":\"BaseLayout\",\"type\":\"scene\",\"data\":{},\"context\":{},\"childrenData\":[{\"id\":\"video-0\",\"componentId\":\"VideoAtom\",\"type\":\"atom\",\"data\":{\"src\":\"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4\",\"className\":\"w-full h-auto object-cover bg-black\",\"fit\":\"cover\"}},{\"id\":\"video-1\",\"componentId\":\"VideoAtom\",\"type\":\"atom\",\"data\":{\"src\":\"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4\",\"className\":\"w-full h-auto object-cover bg-black\",\"fit\":\"cover\"}},{\"id\":\"video-2\",\"componentId\":\"VideoAtom\",\"type\":\"atom\",\"data\":{\"src\":\"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4\",\"className\":\"w-full h-auto object-cover bg-black\",\"fit\":\"cover\"}}]}],\"config\":{\"width\":1920,\"height\":1080,\"fps\":30,\"duration\":20,\"fitDurationTo\":\"video-scene\"},\"style\":{}}"
			},
			"lambdaVersion": "4.0.355",
			"framesPerLambda": 20,
			"memorySizeInMb": 3000,
			"region": "us-east-2",
			"renderId": "ng0vstpl6e",
			"privacy": "public",
			"everyNthFrame": 1,
			"frameRange": [
				0,
				1353
			],
			"audioCodec": "aac",
			"deleteAfter": null,
			"numberOfGifLoops": null,
			"downloadBehavior": {
				"type": "play-in-browser",
				"fileName": null
			},
			"audioBitrate": null,
			"muted": false,
			"metadata": null,
			"functionName": "remotion-render-4-0-347-mem3000mb-disk10240mb-240sec",
			"dimensions": {
				"width": 1920,
				"height": 1080
			},
			"rendererFunctionName": "remotion-render-4-0-347-mem3000mb-disk10240mb-240sec",
			"scale": 1
		},
		"timeoutTimestamp": 1758920880255,
		"compositionValidated": 1758920643366,
		"functionLaunched": 1758920640258,
		"serveUrlOpened": 1758920643017,
		"artifacts": []
	}
}
```
