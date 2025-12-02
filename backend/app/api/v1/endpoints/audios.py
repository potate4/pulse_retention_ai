# import io
# import os
# import json
# import base64
# import uuid
# from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, Form
# import requests
# from sqlalchemy.orm import Session
# from sqlalchemy import func, cast, Date
# from app.api import deps
# from app.db.models.audios import Audios as AudioModel
# from dotenv import load_dotenv
# from app.core.supabase import supabase
# from typing import Annotated, List, Dict, Any
# from app.schemas.audios import Audio
# from app.schemas.audios import DailyProcessingStats, WordCloudItem, PopularTopic, AgentStats, AgentDetailedStats, AgentCSAT, DashboardStats, AllTimeStats
# from app.helpers.audio_transcriptions_gemini import generate_transcripts, analyze_transcripts, get_key_topics, generate_word_cloud_data
# from typing import Any
# from datetime import datetime, timedelta
# from fastapi import File as FastAPIFile
# from collections import Counter
# load_dotenv()

# router = APIRouter()


# BUCKET_NAME = os.getenv("SUPABASE_BUCKET_NAME")


# #################################################################################################
# #   GET ALL Audios
# #################################################################################################
# @router.get("/", response_model=List[Audio])
# async def get_all_audios(db: Session = Depends(deps.get_db)):
#     try:
#         db_questions = db.query(AudioModel).order_by(AudioModel.updated_at.desc()).all()
#         return db_questions
#     except Exception as e:
#         raise HTTPException(status_code=500, detail="Unexpected error: " + str(e))


# #################################################################################################
# #   just uplaod a file and get the google url
# #################################################################################################
# @router.post("/file-upload-and-get-url-and-transcription-for-audio")
# async def upload_file_and_get_url(
#     agentName: str = Form(...),
#     filename: str = Form(...),
#     db: Session = Depends(deps.get_db),
#     file: UploadFile = FastAPIFile(...),
# ) -> Any:
#     local_directory = "temporary_audio"
#     try:
#         # Read the file contents
#         contents = await file.read()
#         just_file_name = file.filename

#         # Generate a unique filename
#         current_time = datetime.now().strftime("%Y%m%d%H%M%S")
#         base_name, extension = os.path.splitext(just_file_name)
#         file_name = f"{base_name}_{current_time}{extension}"

#         # Save the file locally
#         os.makedirs(local_directory, exist_ok=True)
#         local_path = os.path.join(local_directory, file_name)
#         with open(local_path, "wb") as f:
#             f.write(contents)

#         print("upload start")
#         # Upload to Supabase
#         response = supabase.storage.from_('utils').upload(file_name, contents, file_options={"content-type": file.content_type})
#         print("upload end")
#         print(response)

#         # Get the public URL
#         url = supabase.storage.from_('utils').get_public_url(file_name)
#         public_url = url.rstrip('?')

#         transcripts = generate_transcripts(local_path)

#         print("=================== transcripts ==================")
#         print(transcripts)
#         print("=================== transcripts ==================")
#         analysis = analyze_transcripts(transcripts)
#         print("=================== analysis ==================")
#         print(analysis)
#         print("=================== analysis ==================")


#         print("=================== key_topics ==================")
#         print(analysis.key_topics)
#         print(type(analysis.key_topics))
#         print("=================== key_topics ==================")

#         key_topics_list = get_key_topics(transcripts)
#         print("=================== key_topics_list ==================")
#         print(type(key_topics_list))
#         print(key_topics_list)
#         print("=================== key_topics_list ==================")

#         new_audio = AudioModel(
#             fileName=filename,
#             fileUploadPath=local_path,
#             supabasePath=public_url,
#             agentName=agentName,
#             status="gemini_generated",
#             transcript=[{"speaker": t.speaker, "text": t.text} for t in transcripts],
#             conversation_quality=analysis.conversation_quality,
#             client_sentiment=analysis.client_sentiment,
#             mistakes=analysis.agent_mistakes,
#             agent_score=analysis.agent_score,
#             recommendations=analysis.agent_recommendations,
#             reason=analysis.call_reason,
#             key_topics_list=[{"topic": t.topic} for t in key_topics_list],
#             key_topics=analysis.key_topics,
#             sentiment=analysis.sentiment,
#             positive_sentiment_score=analysis.positive_sentiment_score,
#             negative_sentiment_score=analysis.negative_sentiment_score,
#             neutral_sentiment_score=analysis.neutral_sentiment_score,
#             outcome=analysis.outcome,
#             summary=analysis.summary,
#             actionables=analysis.actionables
#         )

#         db.add(new_audio)
#         db.commit()
#         db.refresh(new_audio)

#         return {"url": public_url, "local_path": local_path, "transcripts": transcripts}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail="Unexpected error: " + str(e))
#     finally:
#         # Clean up the temporary directory
#         if os.path.exists(local_directory):
#             for file in os.listdir(local_directory):
#                 file_path = os.path.join(local_directory, file)
#                 if os.path.isfile(file_path):
#                     os.remove(file_path)
#             os.rmdir(local_directory)
#             print(f"Temporary directory {local_directory} cleared")


# #################################################################################################
# #   GET Audio Processing Stats By Date
# #################################################################################################
# @router.get("/stats/daily-processing", response_model=List[DailyProcessingStats])
# async def get_audio_processing_stats_by_date(
#     days: int = 7,
#     db: Session = Depends(deps.get_db)
# ):
#     """
#     Get statistics on how many audio files were processed per day for the specified number of days.
#     """
#     try:
#         # Calculate the start date (n days ago)
#         end_date = datetime.now().date()
#         start_date = end_date - timedelta(days=days-1)
        
#         # Query to count audios by date
#         result = db.query(
#             cast(AudioModel.uploaded_at, Date).label('date'),
#             func.count(AudioModel.id).label('count')
#         ).filter(
#             cast(AudioModel.uploaded_at, Date) >= start_date,
#             cast(AudioModel.uploaded_at, Date) <= end_date
#         ).group_by(
#             cast(AudioModel.uploaded_at, Date)
#         ).order_by(
#             cast(AudioModel.uploaded_at, Date)
#         ).all()
        
#         # Create a dictionary with all dates in the range
#         date_range = [(start_date + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(days)]
#         stats = {date: 0 for date in date_range}
        
#         # Fill in the actual counts
#         for row in result:
#             date_str = row.date.strftime('%Y-%m-%d')
#             stats[date_str] = row.count
        
#         # Convert to list format for frontend
#         formatted_stats = [{"date": date, "count": count} for date, count in stats.items()]
        
#         return formatted_stats
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error retrieving audio processing stats: {str(e)}")


# #################################################################################################
# #   GET Word Cloud Data
# #################################################################################################
# @router.get("/stats/word-cloud", response_model=List[WordCloudItem])
# async def get_word_cloud_data(
#     limit: int = 50,
#     db: Session = Depends(deps.get_db)
# ):
#     """
#     Get data for generating a word cloud based on key topics across all audio files.
#     """
#     try:
#         # Get all audio files with key_topics_list
#         audios = db.query(AudioModel).filter(AudioModel.key_topics_list != None).all()
        
#         # Extract all topics from key_topics_list
#         all_topics = []
#         for audio in audios:
#             if audio.key_topics_list:
#                 for topic_obj in audio.key_topics_list:
#                     if 'topic' in topic_obj and topic_obj['topic'].strip():
#                         all_topics.append(topic_obj['topic'].strip())
        
#         # Count frequency of each topic
#         topic_counter = Counter(all_topics)
        
#         # Get the most common topics
#         most_common = topic_counter.most_common(limit)
        
#         # Format for word cloud
#         word_cloud_data = [topic for topic, _ in most_common]

#         formatted_word_cloud_data = generate_word_cloud_data(word_cloud_data)
#         print("=================== formatted_word_cloud_data ==================")
#         print(formatted_word_cloud_data)
#         print("=================== formatted_word_cloud_data ==================")
        
#         return formatted_word_cloud_data
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error retrieving word cloud data: {str(e)}")


# #################################################################################################
# #   GET Popular Topics
# #################################################################################################
# @router.get("/stats/popular-topics", response_model=List[PopularTopic])
# async def get_popular_topics(
#     limit: int = 10,
#     db: Session = Depends(deps.get_db)
# ):
#     """
#     Get the most popular topics from all audio files.
#     """
#     try:
#         # Get all audio files with key_topics
#         audios = db.query(AudioModel).filter(AudioModel.key_topics != None).all()
        
#         # Extract all topics from key_topics and key_topics_list
#         all_topics = []
        
#         for audio in audios:
#             # Extract from key_topics_list (structured data)
#             if audio.key_topics_list:
#                 for topic_obj in audio.key_topics_list:
#                     if 'topic' in topic_obj and topic_obj['topic'].strip():
#                         all_topics.append(topic_obj['topic'].strip())
            
#             # Also extract from key_topics (string field)
#             if audio.key_topics:
#                 # Split by commas, semicolons, or other common separators
#                 for separator in [',', ';', '|']:
#                     if separator in audio.key_topics:
#                         topics = [t.strip() for t in audio.key_topics.split(separator) if t.strip()]
#                         all_topics.extend(topics)
#                         break
        
#         # Count frequency of each topic
#         topic_counter = Counter(all_topics)
        
#         # Get the most common topics
#         most_common = topic_counter.most_common(limit)
        
#         # Format for frontend
#         popular_topics = [{"topic": topic, "count": count} for topic, count in most_common]
        
#         return popular_topics
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error retrieving popular topics: {str(e)}")


# #################################################################################################
# #   GET Agent Statistics
# #################################################################################################
# @router.get("/stats/agents", response_model=List[AgentStats])
# async def get_agent_statistics(
#     days: int = 30,
#     db: Session = Depends(deps.get_db)
# ):
#     """
#     Get statistics for each agent including call volume, sentiment scores, and performance metrics.
#     """
#     try:
#         # Calculate the start date (n days ago)
#         end_date = datetime.now().date()
#         start_date = end_date - timedelta(days=days)
        
#         # Get all audios within the date range
#         audios = db.query(AudioModel).filter(
#             cast(AudioModel.uploaded_at, Date) >= start_date,
#             cast(AudioModel.uploaded_at, Date) <= end_date
#         ).all()
        
#         # Group by agent
#         agent_data = {}
        
#         for audio in audios:
#             agent_name = audio.agentName
            
#             # Initialize agent data if not exists
#             if agent_name not in agent_data:
#                 agent_data[agent_name] = {
#                     "total_calls": 0,
#                     "sentiment_scores": [],
#                     "positive_calls": 0,
#                     "negative_calls": 0,
#                     "neutral_calls": 0,
#                     "agent_scores": [],
#                     "topics": []
#                 }
            
#             # Increment call count
#             agent_data[agent_name]["total_calls"] += 1
            
#             # Add sentiment data
#             if audio.sentiment:
#                 sentiment = audio.sentiment.lower()
#                 if "positive" in sentiment:
#                     agent_data[agent_name]["positive_calls"] += 1
#                 elif "negative" in sentiment:
#                     agent_data[agent_name]["negative_calls"] += 1
#                 else:
#                     agent_data[agent_name]["neutral_calls"] += 1
            
#             # Add sentiment scores
#             if audio.positive_sentiment_score is not None:
#                 # Calculate overall sentiment score (positive - negative)
#                 sentiment_score = (audio.positive_sentiment_score or 0) - (audio.negative_sentiment_score or 0)
#                 agent_data[agent_name]["sentiment_scores"].append(sentiment_score)
            
#             # Add agent score if available
#             if audio.agent_score and audio.agent_score.replace('.', '', 1).isdigit():
#                 try:
#                     agent_data[agent_name]["agent_scores"].append(float(audio.agent_score))
#                 except (ValueError, TypeError):
#                     pass
            
#             # Add topics
#             if audio.key_topics:
#                 # Split by common separators
#                 for separator in [',', ';', '|']:
#                     if separator in audio.key_topics:
#                         topics = [t.strip() for t in audio.key_topics.split(separator) if t.strip()]
#                         agent_data[agent_name]["topics"].extend(topics)
#                         break
        
#         # Format the results
#         results = []
#         for agent_name, data in agent_data.items():
#             # Calculate average sentiment score
#             avg_sentiment = None
#             if data["sentiment_scores"]:
#                 avg_sentiment = sum(data["sentiment_scores"]) / len(data["sentiment_scores"])
            
#             # Calculate average agent score
#             avg_agent_score = None
#             if data["agent_scores"]:
#                 avg_agent_score = sum(data["agent_scores"]) / len(data["agent_scores"])
            
#             # Get top topics
#             top_topics = []
#             if data["topics"]:
#                 topic_counter = Counter(data["topics"])
#                 top_topics = [topic for topic, _ in topic_counter.most_common(5)]
            
#             results.append({
#                 "agent_name": agent_name,
#                 "total_calls": data["total_calls"],
#                 "avg_sentiment_score": avg_sentiment,
#                 "positive_calls": data["positive_calls"],
#                 "negative_calls": data["negative_calls"],
#                 "neutral_calls": data["neutral_calls"],
#                 "avg_agent_score": avg_agent_score,
#                 "key_topics": top_topics
#             })
        
#         # Sort by total calls (descending)
#         results.sort(key=lambda x: x["total_calls"], reverse=True)
        
#         return results
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error retrieving agent statistics: {str(e)}")


# #################################################################################################
# #   GET Detailed Agent Statistics
# #################################################################################################
# @router.get("/stats/agents/{agent_name}", response_model=AgentDetailedStats)
# async def get_detailed_agent_statistics(
#     agent_name: str,
#     days: int = 30,
#     db: Session = Depends(deps.get_db)
# ):
#     """
#     Get detailed statistics for a specific agent including daily call volume, 
#     sentiment distribution, top topics, and performance metrics.
#     """
#     try:
#         # Calculate the start date (n days ago)
#         end_date = datetime.now().date()
#         start_date = end_date - timedelta(days=days)
        
#         # Get all audios for this agent within the date range
#         audios = db.query(AudioModel).filter(
#             AudioModel.agentName == agent_name,
#             cast(AudioModel.uploaded_at, Date) >= start_date,
#             cast(AudioModel.uploaded_at, Date) <= end_date
#         ).all()
        
#         if not audios:
#             raise HTTPException(status_code=404, detail=f"No data found for agent: {agent_name}")
        
#         # Initialize data structures
#         calls_by_date = {}
#         sentiment_distribution = {"positive": 0, "negative": 0, "neutral": 0}
#         topics = []
#         agent_scores = []
#         positive_scores = []
#         negative_scores = []
#         neutral_scores = []
        
#         # Process each audio
#         for audio in audios:
#             # Process date
#             date_str = audio.uploaded_at.date().strftime('%Y-%m-%d')
#             if date_str not in calls_by_date:
#                 calls_by_date[date_str] = 0
#             calls_by_date[date_str] += 1
            
#             # Process sentiment
#             if audio.sentiment:
#                 sentiment = audio.sentiment.lower()
#                 if "positive" in sentiment:
#                     sentiment_distribution["positive"] += 1
#                     if audio.positive_sentiment_score is not None:
#                         positive_scores.append(audio.positive_sentiment_score)
#                 elif "negative" in sentiment:
#                     sentiment_distribution["negative"] += 1
#                     if audio.negative_sentiment_score is not None:
#                         negative_scores.append(audio.negative_sentiment_score)
#                 else:
#                     sentiment_distribution["neutral"] += 1
#                     if audio.neutral_sentiment_score is not None:
#                         neutral_scores.append(audio.neutral_sentiment_score)
            
#             # Process agent score
#             if audio.agent_score and audio.agent_score.replace('.', '', 1).isdigit():
#                 try:
#                     agent_scores.append(float(audio.agent_score))
#                 except (ValueError, TypeError):
#                     pass
            
#             # Process topics
#             if audio.key_topics:
#                 # Split by common separators
#                 for separator in [',', ';', '|']:
#                     if separator in audio.key_topics:
#                         topics.extend([t.strip() for t in audio.key_topics.split(separator) if t.strip()])
#                         break
            
#             # Also check key_topics_list
#             if audio.key_topics_list:
#                 for topic_obj in audio.key_topics_list:
#                     if 'topic' in topic_obj and topic_obj['topic'].strip():
#                         topics.append(topic_obj['topic'].strip())
        
#         # Format calls by date for the chart
#         date_range = [(start_date + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(days)]
#         calls_by_date_list = [{"date": date, "count": calls_by_date.get(date, 0)} for date in date_range]
        
#         # Get top topics
#         topic_counter = Counter(topics)
#         top_topics = [{"topic": topic, "count": count} for topic, count in topic_counter.most_common(10)]
        
#         # Calculate performance metrics
#         performance_metrics = {
#             "avg_agent_score": sum(agent_scores) / len(agent_scores) if agent_scores else None,
#             "avg_positive_score": sum(positive_scores) / len(positive_scores) if positive_scores else None,
#             "avg_negative_score": sum(negative_scores) / len(negative_scores) if negative_scores else None,
#             "avg_neutral_score": sum(neutral_scores) / len(neutral_scores) if neutral_scores else None,
#             "total_calls": len(audios)
#         }
        
#         # Create the response
#         result = {
#             "agent_name": agent_name,
#             "total_calls": len(audios),
#             "calls_by_date": calls_by_date_list,
#             "sentiment_distribution": sentiment_distribution,
#             "top_topics": top_topics,
#             "performance_metrics": performance_metrics
#         }
        
#         return result
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error retrieving detailed agent statistics: {str(e)}")


# #################################################################################################
# #   GET Agent CSAT Scores
# #################################################################################################
# @router.get("/stats/agents-csat", response_model=List[AgentCSAT])
# async def get_agent_csat_scores(
#     days: int = 30,
#     db: Session = Depends(deps.get_db)
# ):
#     """
#     Get Customer Satisfaction (CSAT) scores for each agent based on sentiment analysis.
#     """
#     try:
#         # Calculate the start date (n days ago)
#         end_date = datetime.now().date()
#         start_date = end_date - timedelta(days=days)
        
#         # Get all audios within the date range
#         audios = db.query(AudioModel).filter(
#             cast(AudioModel.uploaded_at, Date) >= start_date,
#             cast(AudioModel.uploaded_at, Date) <= end_date
#         ).all()
        
#         # Group by agent
#         agent_data = {}
        
#         for audio in audios:
#             agent_name = audio.agentName
            
#             # Initialize agent data if not exists
#             if agent_name not in agent_data:
#                 agent_data[agent_name] = {
#                     "total_calls": 0,
#                     "positive_calls": 0
#                 }
            
#             # Increment call count
#             agent_data[agent_name]["total_calls"] += 1
            
#             # Count positive sentiment calls
#             if audio.sentiment and "positive" in audio.sentiment.lower():
#                 agent_data[agent_name]["positive_calls"] += 1
#             elif audio.sentiment and "neutral" in audio.sentiment.lower():
#                 # Count neutral sentiment as partially positive (50%)
#                 agent_data[agent_name]["positive_calls"] += 0.5
#             elif audio.positive_sentiment_score is not None and audio.positive_sentiment_score > 0.5:
#                 agent_data[agent_name]["positive_calls"] += 1
#             elif audio.neutral_sentiment_score is not None and audio.neutral_sentiment_score > 0.5:
#                 # Count high neutral score as partially positive
#                 agent_data[agent_name]["positive_calls"] += 0.5
        
#         # Calculate CSAT scores (percentage of positive calls)
#         csat_scores = []
#         for agent_name, data in agent_data.items():
#             if data["total_calls"] > 0:
#                 csat_percentage = (data["positive_calls"] / data["total_calls"]) * 100
#                 csat_scores.append({
#                     "agent_name": agent_name,
#                     "total_calls": data["total_calls"],
#                     "csat_percentage": round(csat_percentage, 2)
#                 })
        
#         # Sort by total calls (descending)
#         csat_scores.sort(key=lambda x: x["total_calls"], reverse=True)
        
#         return csat_scores
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error retrieving agent CSAT scores: {str(e)}")


# #################################################################################################
# #   GET Dashboard Statistics
# #################################################################################################
# @router.get("/stats/dashboard", response_model=DashboardStats)
# async def get_dashboard_statistics(
#     db: Session = Depends(deps.get_db)
# ):
#     """
#     Get overall statistics for the dashboard including total calls, recent activity,
#     sentiment distribution, and top agents.
#     """
#     try:
#         # Get current date and time
#         now = datetime.now()
#         today = now.date()
#         start_of_week = today - timedelta(days=today.weekday())
#         start_of_month = today.replace(day=1)
        
#         # Get all audios
#         all_audios = db.query(AudioModel).all()
        
#         # Get counts for different time periods
#         total_calls = len(all_audios)
#         calls_today = db.query(AudioModel).filter(
#             cast(AudioModel.uploaded_at, Date) == today
#         ).count()
#         calls_this_week = db.query(AudioModel).filter(
#             cast(AudioModel.uploaded_at, Date) >= start_of_week
#         ).count()
#         calls_this_month = db.query(AudioModel).filter(
#             cast(AudioModel.uploaded_at, Date) >= start_of_month
#         ).count()
        
#         # Calculate sentiment distribution
#         sentiment_distribution = {"positive": 0, "negative": 0, "neutral": 0}
#         sentiment_scores = []
        
#         for audio in all_audios:
#             if audio.sentiment:
#                 sentiment = audio.sentiment.lower()
#                 if "positive" in sentiment:
#                     sentiment_distribution["positive"] += 1
#                 elif "negative" in sentiment:
#                     sentiment_distribution["negative"] += 1
#                 else:
#                     sentiment_distribution["neutral"] += 1
            
#             # Calculate overall sentiment score
#             if audio.positive_sentiment_score is not None:
#                 sentiment_score = (audio.positive_sentiment_score or 0) - (audio.negative_sentiment_score or 0)
#                 sentiment_scores.append(sentiment_score)
        
#         # Calculate average sentiment score
#         avg_sentiment_score = None
#         if sentiment_scores:
#             avg_sentiment_score = sum(sentiment_scores) / len(sentiment_scores)
        
#         # Get top agents by call volume
#         agent_call_counts = {}
#         for audio in all_audios:
#             agent_name = audio.agentName
#             if agent_name not in agent_call_counts:
#                 agent_call_counts[agent_name] = 0
#             agent_call_counts[agent_name] += 1
        
#         top_agents = [
#             {"agent_name": agent, "total_calls": count}
#             for agent, count in sorted(agent_call_counts.items(), key=lambda x: x[1], reverse=True)[:5]
#         ]
        
#         # Get recent calls
#         recent_calls = db.query(AudioModel).order_by(AudioModel.uploaded_at.desc()).limit(5).all()
#         recent_calls_data = [
#             {
#                 "id": str(call.id),
#                 "agent_name": call.agentName,
#                 "uploaded_at": call.uploaded_at.isoformat(),
#                 "sentiment": call.sentiment,
#                 "key_topics": call.key_topics
#             }
#             for call in recent_calls
#         ]
        
#         # Create the response
#         result = {
#             "total_calls": total_calls,
#             "calls_today": calls_today,
#             "calls_this_week": calls_this_week,
#             "calls_this_month": calls_this_month,
#             "avg_sentiment_score": avg_sentiment_score,
#             "sentiment_distribution": sentiment_distribution,
#             "top_agents": top_agents,
#             "recent_calls": recent_calls_data
#         }
        
#         return result
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error retrieving dashboard statistics: {str(e)}")


# #################################################################################################
# #   GET All-Time Statistics
# #################################################################################################
# @router.get("/stats/all-time", response_model=AllTimeStats)
# async def get_all_time_statistics(
#     db: Session = Depends(deps.get_db)
# ):
#     """
#     Get comprehensive statistics for all time, including total calls, agent performance,
#     sentiment distribution, and trends over time.
#     """
#     try:
#         # Get all audios
#         all_audios = db.query(AudioModel).all()
        
#         if not all_audios:
#             raise HTTPException(status_code=404, detail="No audio data found")
        
#         # Get total calls
#         total_calls = len(all_audios)
        
#         # Get unique agents
#         unique_agents = set(audio.agentName for audio in all_audios)
#         total_agents = len(unique_agents)
        
#         # Calculate average calls per agent
#         avg_calls_per_agent = total_calls / total_agents if total_agents > 0 else 0
        
#         # Calculate sentiment distribution
#         sentiment_distribution = {"positive": 0, "negative": 0, "neutral": 0}
#         sentiment_scores = []
#         agent_scores = []
        
#         # Group by agent for top agents
#         agent_call_counts = {}
        
#         # Group by month for trend
#         monthly_calls = {}
        
#         # Collect topics
#         all_topics = []
        
#         for audio in all_audios:
#             # Process sentiment
#             if audio.sentiment:
#                 sentiment = audio.sentiment.lower()
#                 if "positive" in sentiment:
#                     sentiment_distribution["positive"] += 1
#                 elif "negative" in sentiment:
#                     sentiment_distribution["negative"] += 1
#                 else:
#                     sentiment_distribution["neutral"] += 1
            
#             # Calculate overall sentiment score
#             if audio.positive_sentiment_score is not None:
#                 sentiment_score = (audio.positive_sentiment_score or 0) - (audio.negative_sentiment_score or 0)
#                 sentiment_scores.append(sentiment_score)
            
#             # Process agent score
#             if audio.agent_score and audio.agent_score.replace('.', '', 1).isdigit():
#                 try:
#                     agent_scores.append(float(audio.agent_score))
#                 except (ValueError, TypeError):
#                     pass
            
#             # Count calls per agent
#             agent_name = audio.agentName
#             if agent_name not in agent_call_counts:
#                 agent_call_counts[agent_name] = 0
#             agent_call_counts[agent_name] += 1
            
#             # Group by month
#             if audio.uploaded_at:
#                 month_key = audio.uploaded_at.strftime('%Y-%m')
#                 if month_key not in monthly_calls:
#                     monthly_calls[month_key] = 0
#                 monthly_calls[month_key] += 1
            
#             # Process topics
#             if audio.key_topics:
#                 # Split by common separators
#                 for separator in [',', ';', '|']:
#                     if separator in audio.key_topics:
#                         topics = [t.strip() for t in audio.key_topics.split(separator) if t.strip()]
#                         all_topics.extend(topics)
#                         break
            
#             # Also check key_topics_list
#             if audio.key_topics_list:
#                 for topic_obj in audio.key_topics_list:
#                     if 'topic' in topic_obj and topic_obj['topic'].strip():
#                         all_topics.append(topic_obj['topic'].strip())
        
#         # Calculate average sentiment score
#         avg_sentiment_score = None
#         if sentiment_scores:
#             avg_sentiment_score = sum(sentiment_scores) / len(sentiment_scores)
        
#         # Calculate average agent score
#         avg_agent_score = None
#         if agent_scores:
#             avg_agent_score = sum(agent_scores) / len(agent_scores)
        
#         # Get top agents
#         top_agents = [
#             {"agent_name": agent, "total_calls": count}
#             for agent, count in sorted(agent_call_counts.items(), key=lambda x: x[1], reverse=True)[:10]
#         ]
        
#         # Get top topics
#         topic_counter = Counter(all_topics)
#         top_topics = [
#             {"topic": topic, "count": count}
#             for topic, count in topic_counter.most_common(15)
#         ]
        
#         # Format monthly trend
#         monthly_trend = [
#             {"month": month, "count": count}
#             for month, count in sorted(monthly_calls.items())
#         ]
        
#         # Create the response
#         result = {
#             "total_calls": total_calls,
#             "total_agents": total_agents,
#             "avg_calls_per_agent": round(avg_calls_per_agent, 2),
#             "sentiment_distribution": sentiment_distribution,
#             "avg_sentiment_score": avg_sentiment_score,
#             "avg_agent_score": avg_agent_score,
#             "top_agents": top_agents,
#             "top_topics": top_topics,
#             "monthly_trend": monthly_trend
#         }
        
#         return result
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error retrieving all-time statistics: {str(e)}")


# #################################################################################################
# #   GET All-Time Agent Statistics
# #################################################################################################
# @router.get("/stats/agents-all-time", response_model=List[AgentStats])
# async def get_all_time_agent_statistics(
#     db: Session = Depends(deps.get_db)
# ):
#     """
#     Get statistics for each agent across all time, without any date filtering.
#     """
#     try:
#         # Get all audios
#         all_audios = db.query(AudioModel).all()
        
#         # Group by agent
#         agent_data = {}
        
#         for audio in all_audios:
#             agent_name = audio.agentName
            
#             # Initialize agent data if not exists
#             if agent_name not in agent_data:
#                 agent_data[agent_name] = {
#                     "total_calls": 0,
#                     "sentiment_scores": [],
#                     "positive_calls": 0,
#                     "negative_calls": 0,
#                     "neutral_calls": 0,
#                     "agent_scores": [],
#                     "topics": []
#                 }
            
#             # Increment call count
#             agent_data[agent_name]["total_calls"] += 1
            
#             # Add sentiment data
#             if audio.sentiment:
#                 sentiment = audio.sentiment.lower()
#                 if "positive" in sentiment:
#                     agent_data[agent_name]["positive_calls"] += 1
#                 elif "negative" in sentiment:
#                     agent_data[agent_name]["negative_calls"] += 1
#                 else:
#                     agent_data[agent_name]["neutral_calls"] += 1
            
#             # Add sentiment scores
#             if audio.positive_sentiment_score is not None:
#                 # Calculate overall sentiment score (positive - negative)
#                 sentiment_score = (audio.positive_sentiment_score or 0) - (audio.negative_sentiment_score or 0)
#                 agent_data[agent_name]["sentiment_scores"].append(sentiment_score)
            
#             # Add agent score if available
#             if audio.agent_score and audio.agent_score.replace('.', '', 1).isdigit():
#                 try:
#                     agent_data[agent_name]["agent_scores"].append(float(audio.agent_score))
#                 except (ValueError, TypeError):
#                     pass
            
#             # Add topics
#             if audio.key_topics:
#                 # Split by common separators
#                 for separator in [',', ';', '|']:
#                     if separator in audio.key_topics:
#                         topics = [t.strip() for t in audio.key_topics.split(separator) if t.strip()]
#                         agent_data[agent_name]["topics"].extend(topics)
#                         break
            
#             # Also check key_topics_list
#             if audio.key_topics_list:
#                 for topic_obj in audio.key_topics_list:
#                     if 'topic' in topic_obj and topic_obj['topic'].strip():
#                         agent_data[agent_name]["topics"].append(topic_obj['topic'].strip())
        
#         # Format the results
#         results = []
#         for agent_name, data in agent_data.items():
#             # Calculate average sentiment score
#             avg_sentiment = None
#             if data["sentiment_scores"]:
#                 avg_sentiment = sum(data["sentiment_scores"]) / len(data["sentiment_scores"])
            
#             # Calculate average agent score
#             avg_agent_score = None
#             if data["agent_scores"]:
#                 avg_agent_score = sum(data["agent_scores"]) / len(data["agent_scores"])
            
#             # Get top topics
#             top_topics = []
#             if data["topics"]:
#                 topic_counter = Counter(data["topics"])
#                 top_topics = [topic for topic, _ in topic_counter.most_common(5)]
            
#             results.append({
#                 "agent_name": agent_name,
#                 "total_calls": data["total_calls"],
#                 "avg_sentiment_score": avg_sentiment,
#                 "positive_calls": data["positive_calls"],
#                 "negative_calls": data["negative_calls"],
#                 "neutral_calls": data["neutral_calls"],
#                 "avg_agent_score": avg_agent_score,
#                 "key_topics": top_topics
#             })
        
#         # Sort by total calls (descending)
#         results.sort(key=lambda x: x["total_calls"], reverse=True)
        
#         return results
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error retrieving all-time agent statistics: {str(e)}")


# #################################################################################################
# #   GET All-Time Agent CSAT Scores
# #################################################################################################
# @router.get("/stats/agents-csat-all-time", response_model=List[AgentCSAT])
# async def get_all_time_agent_csat_scores(
#     db: Session = Depends(deps.get_db)
# ):
#     """
#     Get Customer Satisfaction (CSAT) scores for each agent based on all data, without time constraints.
#     """
#     try:
#         # Get all audios
#         all_audios = db.query(AudioModel).all()
        
#         # Group by agent
#         agent_data = {}
        
#         for audio in all_audios:
#             agent_name = audio.agentName
            
#             # Initialize agent data if not exists
#             if agent_name not in agent_data:
#                 agent_data[agent_name] = {
#                     "total_calls": 0,
#                     "positive_calls": 0
#                 }
            
#             # Increment call count
#             agent_data[agent_name]["total_calls"] += 1
            
#             # Count positive sentiment calls
#             if audio.sentiment and "positive" in audio.sentiment.lower():
#                 agent_data[agent_name]["positive_calls"] += 1
#             elif audio.sentiment and "neutral" in audio.sentiment.lower():
#                 # Count neutral sentiment as partially positive (50%)
#                 agent_data[agent_name]["positive_calls"] += 0.5
#             elif audio.positive_sentiment_score is not None and audio.positive_sentiment_score > 0.5:
#                 agent_data[agent_name]["positive_calls"] += 1
#             elif audio.neutral_sentiment_score is not None and audio.neutral_sentiment_score > 0.5:
#                 # Count high neutral score as partially positive
#                 agent_data[agent_name]["positive_calls"] += 0.5
        
#         # Calculate CSAT scores (percentage of positive calls)
#         csat_scores = []
#         for agent_name, data in agent_data.items():
#             if data["total_calls"] > 0:
#                 csat_percentage = (data["positive_calls"] / data["total_calls"]) * 100
#                 csat_scores.append({
#                     "agent_name": agent_name,
#                     "total_calls": data["total_calls"],
#                     "csat_percentage": round(csat_percentage, 2)
#                 })
        
#         # Sort by total calls (descending)
#         csat_scores.sort(key=lambda x: x["total_calls"], reverse=True)
        
#         return csat_scores
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error retrieving all-time agent CSAT scores: {str(e)}")



