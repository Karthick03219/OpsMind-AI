_model = None

MODEL_NAME = "all-MiniLM-L6-v2"


def get_model():
    global _model

    if _model is None:
        from sentence_transformers import SentenceTransformer

        print("Loading embedding model...")

        _model = SentenceTransformer(MODEL_NAME)

        print("Embedding model loaded.")

    return _model


def generate_embedding(text):
    if not text:
        return []

    model = get_model()

    embedding = model.encode(text)

    return embedding.tolist()