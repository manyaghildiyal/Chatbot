from flask import Flask, render_template, request, jsonify, url_for
from flask_cors import CORS
import os
import json
import pickle
from sentence_transformers import SentenceTransformer, util
from better_profanity import profanity  # Import the profanity filter
from supabase import create_client, Client


SUPABASE_URL = "https://vkhchvapbnxxwfiqzusp.supabase.co"  # Your Supabase project URL
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZraGNodmFwYm54eHdmaXF6dXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ1NzcyMjAsImV4cCI6MjA0MDE1MzIyMH0.0zfIP46aVi3clJ1wzmJwl1L4dCCp6U7cx5XiFAt6bgY"  # Your Supabase API Key
LOG_TABLE = 'chat_logs'
# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Specify the static folder
app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)


LOG_FILE = 'chat_log.csv'
KNOWLEDGE_BASE_FILE = 'knowledge_base.json'
EMBEDDINGS_CACHE = 'embeddings_cache.pkl'

# Load knowledge base from JSON file
with open(KNOWLEDGE_BASE_FILE, 'r') as f:
    knowledge_base = json.load(f)['knowledge_base']

# Flatten the knowledge base into questions and answers
questions = []
answers = {}

for category in knowledge_base:
    for entry in category['entries']:
        questions.append(entry['question'])
        answers[entry['question']] = entry['answer']

# Initialize the Sentence Transformer model
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

def save_embeddings_cache():
    with open(EMBEDDINGS_CACHE, 'wb') as cache_file:
        pickle.dump((questions, question_embeddings), cache_file)

def load_embeddings_cache():
    global question_embeddings
    if os.path.exists(EMBEDDINGS_CACHE):
        with open(EMBEDDINGS_CACHE, 'rb') as cache_file:
            cached_questions, question_embeddings = pickle.load(cache_file)
        # Check if cached questions match the current knowledge base
        if cached_questions != questions:
            update_embeddings()
            save_embeddings_cache()
    else:
        update_embeddings()
        save_embeddings_cache()

def update_embeddings():
    global question_embeddings
    question_embeddings = model.encode(questions, convert_to_tensor=True)

# Load embeddings from cache or compute them
load_embeddings_cache()

# State to track the previous interaction
previous_interaction = {
    'user_input': None,
    'bot_response': None,
    'review_submitted': True
}

def find_answer(query):
    # Convert the query to an embedding
    query_embedding = model.encode(query, convert_to_tensor=True)

    # Compute cosine similarities between the query and all questions
    cosine_scores = util.pytorch_cos_sim(query_embedding, question_embeddings)

    # Find the index of the best match
    best_match_index = cosine_scores.argmax().item()

    # Retrieve the corresponding answer
    response = answers[questions[best_match_index]]

    return response

def log_interaction(user_input, bot_response, relevant, non_relevant, review):
    # Insert data into Supabase table
    data = {
        'user_input': user_input,
        'bot_response': bot_response,
        'relevant': relevant,
        'non_relevant': non_relevant,
        'review': review
    }

    supabase.table(LOG_TABLE).insert(data).execute()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    prompt = data.get('prompt')

    if not prompt:
        return jsonify({'error': 'No prompt provided'}), 400

    # Check for bad language using better_profanity
    if profanity.contains_profanity(prompt):
        # Log the interaction with the inappropriate language response
        log_interaction(
            user_input=prompt,
            bot_response='Please use appropriate language to ask the question',
            relevant='',
            non_relevant='',
            review=''
        )

        # Update the previous interaction state
        previous_interaction['user_input'] = prompt
        previous_interaction['bot_response'] = 'Please use appropriate language to ask the question'
        previous_interaction['review_submitted'] = False

        return jsonify({'response': 'Please use appropriate language to ask the question'}), 200

    # Find answer for the new query
    response = find_answer(prompt)

    # Update the previous interaction state
    previous_interaction['user_input'] = prompt
    previous_interaction['bot_response'] = response
    previous_interaction['review_submitted'] = False

    return jsonify({'response': response})

@app.route('/api/log', methods=['POST'])
def log():
    data = request.get_json()

    user_input = data.get('user_input')
    bot_response = data.get('bot_response')
    button1_state = data.get('button1_state')
    button2_state = data.get('button2_state')
    review_text = data.get('review_text')

    if not all([user_input, bot_response, button1_state, button2_state, review_text]):
        return jsonify({'error': 'Incomplete data'}), 400

    # Log the interaction only if the user has clicked the submit button
    if previous_interaction['bot_response'] != 'Please use appropriate language to ask the question':
        log_interaction(user_input, bot_response, button1_state, button2_state, review_text)
        previous_interaction['review_submitted'] = True

    return jsonify({'status': 'Log saved'})
