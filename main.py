from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from peewee import Model, MySQLDatabase, CharField, TextField, IntegrityError, AutoField

# Conexão com o banco MySQL
db = MySQLDatabase(
    'matematica-marcia',
    user='root',
    host='127.0.0.1',
    port=3306,
)

# Modelo de tabela
class MathTerm(Model):
    id = AutoField()
    term = CharField(unique=True)  # Nome do termo
    definition = TextField()       # Definição
    theme = CharField()            # Tema
    example = TextField(null=True) # Exemplo (opcional)
    source = CharField()           # Fonte

    class Meta:
        database = db  # Conexão com o banco

# Inicializar banco de dados e criar tabela (se necessário)
db.connect()
db.create_tables([MathTerm])

# FastAPI
app = FastAPI()

# Configuração de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir qualquer origem (para desenvolvimento)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gerenciamento de conexão com o banco
@app.on_event("startup")
def startup():
    if db.is_closed():
        db.connect()

@app.on_event("shutdown")
def shutdown():
    if not db.is_closed():
        db.close()

# Modelos de entrada para validação
class TermInput(BaseModel):
    term: str
    definition: str
    theme: str
    example: str = None
    source: str

# Endpoints
@app.post("/add_term/")
async def add_term(term_data: TermInput):
    try:
        # Criar novo termo no banco de dados
        new_term = MathTerm.create(**term_data.dict())
        return {"message": "Term added successfully", "term": new_term.term}
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Term already exists.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/terms/")
async def get_terms(theme: str = None, alphabetical: bool = True):
    # Consultar termos
    query = MathTerm.select()
    if theme:
        query = query.where(MathTerm.theme == theme)
    terms = query.order_by(MathTerm.term if alphabetical else MathTerm.id)
    return [
        {"id": t.id,"term": t.term, "definition": t.definition, "theme": t.theme, "example": t.example, "source": t.source}
        for t in terms
    ]

@app.get("/search/")
async def search_terms(keyword: str):
    # Buscar termos por palavra-chave
    terms = MathTerm.select().where(
        MathTerm.term.contains(keyword) | MathTerm.definition.contains(keyword)
    )
    return [
        {"id": t.id,"term": t.term, "definition": t.definition, "theme": t.theme, "example": t.example, "source": t.source}
        for t in terms
    ]

@app.get("/terms/{term_id}")
async def get_term_by_id(term_id: int):
    try:
        term = MathTerm.get_by_id(term_id)
        return {
            "id": term.id,
            "term": term.term,
            "definition": term.definition,
            "theme": term.theme,
            "example": term.example,
            "source": term.source
        }
    except MathTerm.DoesNotExist:
        raise HTTPException(status_code=404, detail="Term not found.")


@app.delete("/delete_term/{term_id}")
async def delete_term(term_id: int):
    try:
        # Deletar termo pelo ID
        term = MathTerm.get_by_id(term_id)
        term.delete_instance()
        return {"message": "Term deleted successfully"}
    except MathTerm.DoesNotExist:
        raise HTTPException(status_code=404, detail="Term not found.")

# Atualizar termo
@app.put("/update_term/{term_id}")
async def update_term(term_id: int, term_data: TermInput):
    try:
        # Atualizar termo pelo ID
        term = MathTerm.get_by_id(term_id)
        term.term = term_data.term
        term.definition = term_data.definition
        term.theme = term_data.theme
        term.example = term_data.example
        term.source = term_data.source
        term.save()
        return {"message": "Term updated successfully"}
    except MathTerm.DoesNotExist:
        raise HTTPException(status_code=404, detail="Term not found.")
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Term with this name already exists.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
