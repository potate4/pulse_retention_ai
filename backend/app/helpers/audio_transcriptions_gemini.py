from typing import List
from google.genai import types
from google import genai
from app.core.config import settings
from app.schemas.audios import Transcripts, Transcript, ConversationAnalysisNew, KeyTopic, WordCloudData


client = genai.Client(api_key=settings.GOOGLE_API_KEY)


def generate_transcripts(file_path: str):
    
    myfile = client.files.upload(file=file_path)

    prompt = "Transcribe this audio with speaker detection and with proper transcription text. One speaker is a customer care agent, another is a customer."


    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents=[prompt, myfile],
        config={
        'temperature': 1,
        'response_mime_type': 'text/plain',
        },
    )

    format_reponse_prompt = f"""Format the response in a JSON format. The response should be a list of objects, each object should have a speaker and a text.\n {response.text}"""
  
    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents=format_reponse_prompt,
        config={
        'temperature': 1,
        'response_mime_type': 'application/json',
        'response_schema': list[Transcript],
        },
    )

    return response.parsed


def analyze_transcripts(transcripts: List[Transcript]):
    prompt = f"""Analyze the following transcripts: {transcripts} and return the following fields:
    - conversation_quality (how well the agent handled the call, choose from: Excellent, Good, Fair, Poor)
    - client_sentiment (how the client felt about the call, choose from: Very Happy, Happy, Neutral, Unhappy, Very Unhappy)
    - agent_mistakes (mistakes made by the agent, specifically point out the error parts. Include any paraphrasing opportunities or misinformation. Must quote the mistake parts.)
    - agent_score (score of the agent out of 10)
    - agent_recommendations (recommendations for the agent to better handle the call)
    - call_reason (reason for the call)
    - key_topics (key topics discussed in the call)
    - sentiment (sentiment of the call)
    - positive_sentiment_score (positive sentiment score of the call on a scale of 0 to 1)
    - negative_sentiment_score (negative sentiment score of the call on a scale of 0 to 1)
    - neutral_sentiment_score (neutral sentiment score of the call on a scale of 0 to 1) 
    - outcome (outcome of the call)
    - summary (summary of the call)
    - actionables (actionables for the agent to improve the call)
    """

    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents=prompt,
         config={
        'temperature': 1,
        'response_mime_type': 'application/json',
        'response_schema': ConversationAnalysisNew,
        },
    )

    return response.parsed



def get_key_topics(transcripts: List[Transcript]):
    prompt = f"""Analyze the following transcripts: {transcripts} and return the following fields:
    - key_topics (key words said by the customer and the agent in the call. Return a list of key words.
    )
    """

    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents=prompt,
         config={
        'temperature': 1,
        'response_mime_type': 'application/json',
        'response_schema': list[KeyTopic],
        },
    )

    return response.parsed

def generate_word_cloud_data(key_topics: List[str]):
    prompt = f"""Analyze the following key words extracted from voice transcriptions: 
    {key_topics} and return the following fields:
    - text (key words)
    - value (frequency of the key words)

    The value should be higher for words or topics that are more frequently used in the transcripts.
    Set the values between 0 to 10 depending on the frequency of the key words.
    """

    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents=prompt,
         config={
        'temperature': 1,
        'response_mime_type': 'application/json',
        'response_schema': list[WordCloudData],
        },
    )

    return response.parsed