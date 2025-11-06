const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');




const app = express();

app.use(express.static('Public'));
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

const sslOptions = {
    ca: fs.readFileSync('./BaltimoreCyberTrustRoot.crt.pem'),
}


const db = mysql.createConnection({
    host: 'condominioatividade.database.windows.net', 
    user: 'root@',  
    password: 'Cedup@2025', 
    database: 'GerenciaCondominio', 
    port: 3306,
    ssl: sslOptions 
});



db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
    } else {
        console.log('Conectado ao banco de dados!');
    }
});

//tive q usar o fs aqui, pq foi a unica maneira que consegui fazer o html funcionar

app.get("/", (req, res) => {
    const queries = {
        residents: "SELECT COUNT(*) as total FROM moradores",
        collected: "SELECT SUM(valor_pago) as total FROM pagamentos WHERE status = 'pago'",
        requests: "SELECT COUNT(*) as total FROM manutencoes"
    };

    db.query(queries.residents, (err, resResidents) => {
        if (err) return res.status(500).send("Failed to fetch residents");

        db.query(queries.collected, (err, resCollected) => {
            if (err) return res.status(500).send("Failed to fetch collected");

            db.query(queries.requests, (err, resRequests) => {
                if (err) return res.status(500).send("Failed to fetch requests");

                const totalResidents = resResidents[0].total;
                const totalCollected = parseFloat(resCollected[0].total) || 0;
                const totalRequests = resRequests[0].total;

                fs.readFile(path.join(__dirname, '/index.html'), 'utf8', (err, html) => {
                    if (err) return res.status(500).send("Failed to load page");

                    const finalHtml = html
                        .replace('{{totalResidents}}', totalResidents)
                        .replace('{{totalCollected}}', `R$ ${totalCollected.toFixed(2).replace('.', ',')}`)
                        .replace('{{totalRequests}}', totalRequests);

                    res.send(finalHtml);
                });
            });
        });
    });
});



app.get("/block/create", function(req, res){
    res.sendFile(__dirname + "/Pages/Block/Create/index.html");
});


app.get("/block/read", function(req, res) {
    let searchTerm = req.query.search || ""; 
   
    const listar = `SELECT * FROM blocos WHERE descricao LIKE ? OR qtd_apartamentos LIKE ?`;

    db.query(listar, [`%${searchTerm}%`, `%${searchTerm}%`], function(err, rows) {
        if (!err) {
            console.log("Consulta de blocos realizada com sucesso!");

            res.send(`
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head> 
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>SysCondomínio - Blocos</title>
                    <link rel="stylesheet" href="/style.css">
                    <link rel="stylesheet" href="/styleBlockCreate.css">
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                </head>
                <body>
                    <div class="app-container">
                        <header class="app-header">
                            <div class="logo">
                                <i class="fas fa-building"></i>
                                <h1>SysCondomínio</h1>
                            </div>
                            <div class="user-area">
                                <span>Síndico</span>
                                <img src="/images/user-avatar.jpg" alt="Usuário">
                            </div>
                        </header>

                        <nav class="sidebar">
                            <ul class="menu">
                                <li><a href="/block/read"><i class="fas fa-search"></i> Pesquisa de Blocos</a></li>
                                <li><a href="/apartment/read"><i class="fas fa-search"></i> Pesquisa de Apartamentos</a></li>
                                <li><a href="/resident/read"><i class="fas fa-user-friends"></i> Pesquisa de Moradores</a></li>
                                <li><a href="/payment/create"><i class="fas fa-hand-holding-usd"></i> Registro de Pagamento</a></li>
                                <li><a href="/maintenance/create"><i class="fas fa-clipboard-list"></i> Registro de tipos de Manutenção</a></li>
                                <li><a href="/maintenance/register"><i class="fas fa-hammer"></i> Registrar Manutenção</a></li>
                            </ul>
                        </nav>

                        <main class="main-content">
                            <div class="page-header">
                                <h2><i class="fas fa-cube"></i> Blocos Cadastrados</h2>
                                <div class="actions">
                                    <a href="/block/create" class="btn-primary">
                                        <i class="fas fa-plus"></i> Novo Bloco
                                    </a>
                                    <a href="/" class="btn-primary">
                                        <i class="fas fa-backward"></i> Voltar
                                    </a>
                                </div>
                            </div>

                            <div class="search-container">
                                <div class="search-bar">
                                    <form method="GET" action="/block/read">
                                        <input type="text" name="search" id="searchInput" placeholder="Pesquisar blocos..." value="${searchTerm}">
                                        <button type="submit" id="searchBtn" class="btn-icon">
                                            <i class="fas fa-search"></i>
                                        </button>
                                    </form>
                                </div>
                            </div>

                            <div class="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>id</th>
                                            <th>Descrição</th>
                                            <th>Quantidade de Apartamentos</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${rows.map(row => `
                                            <tr>
                                                <td>${row.id}</td>
                                                <td>${row.descricao}</td>
                                                <td>${row.qtd_apartamentos}</td>
                                                <td class="actions-cell">
                                                    <a href="/block/update/${row.id}" class="btn-icon">
                                                        <i class="fas fa-edit"></i>
                                                    </a>
                                                    <a href="/block/delete/${row.id}" class="btn-icon danger" onclick="return confirm('Tem certeza que deseja excluir este bloco?')">
                                                        <i class="fas fa-trash"></i>
                                                    </a>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </main>
                    </div>
                </body>
                </html>
            `);
        } else {
            console.log("Erro ao consultar blocos:", err);
            res.send(`
                <html>
                    <head>
                        <title>Erro</title>
                    </head>
                    <body>
                        <h1>Erro ao carregar blocos</h1>
                        <p>${err.message}</p>
                        <a href="/">Voltar</a>
                    </body>
                </html>
            `);
        }
    });
});

app.post('/block/create/block', function(req, res) {
    const descricao = req.body.descricao;
    const quantidadeApto = req.body.qtd_apartamentos;

    const values = [descricao, quantidadeApto];
    const insert = "INSERT INTO blocos (descricao, qtd_apartamentos) VALUES (?, ?)";

    db.query(insert, values, function(err, result) {
        if (!err) {
            console.log("Dados inseridos com sucesso!");
        } else {
            console.log("Erro ao inserir dados!", err);
            res.send("Erro ao inserir dados!");
        }
    })
})

app.get('/block/delete/:id', function(req, res){
    const id = req.params.id;

    db.query('DELETE FROM blocos WHERE id = ?', [id], function(err, result){
        if (err) {
            console.log('Erro ao excluir o produto', err);
            res.status(500).send('Erro ao excluir o produto');
            return;
        }
    })
    console.log('Produto excluído com sucesso!');
    res.redirect('/block/read');
});

app.get('/block/update/:id', function(req, res){
    const id = req.params.id;

    db.query('SELECT * FROM blocos WHERE id = ?', [id], function(err, result){
        if (err) {
            console.log('Erro ao editar o bloco', err);
            res.status(500).send('Erro ao editar o bloco');
            return;
        }
        res.send(`
            <html>
                <head> 
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title> SysCondomínio </title>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                    <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }

                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background-color: #f5f7fa;
                        color: #263238;
                        line-height: 1.6;
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        padding: 2rem;
                    }

                    .header {
                        width: 100%;
                        max-width: 1200px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 2rem;
                    }

                    .container {
                        width: 100%;
                        max-width: 1200px;
                        display: flex;
                        flex-direction: column;
                        gap: 2rem;
                    }

                    h1 {
                        color: #1e88e5;
                        font-size: 2.5rem;
                        margin-bottom: 0.5rem;
                    }

                    h2 {
                        color: #1565c0;
                        font-size: 1.8rem;
                        margin-bottom: 1rem;
                    }

                    .card {
                        background-color: #ffffff;
                        border-radius: 8px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        padding: 2rem;
                        margin-bottom: 1rem;
                        width: 100%;
                        max-width: 600px;
                    }

                    .form-group {
                        display: flex;
                        flex-direction: column;
                        gap: 1.5rem;
                    }

                    .form-row {
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }

                    .input-group {
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                    }

                    label {
                        font-weight: 500;
                        color: #1565c0;
                    }

                    input, textarea {
                        padding: 0.75rem;
                        border: 1px solid #e0e0e0;
                        border-radius: 4px;
                        font-size: 1rem;
                        background-color: #ffffff;
                        color: #263238;
                        width: 100%;
                    }

                    input:focus,
                    textarea:focus {
                        outline: none;
                        border-color: #1e88e5;
                        box-shadow: 0 0 0 2px rgba(30, 136, 229, 0.2);
                    }

                    button {
                        padding: 0.75rem 1.5rem;
                        background-color: #1e88e5;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        font-size: 1rem;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        margin-top: 1rem;
                    }

                    button:hover {
                        background-color: #1565c0;
                        transform: translateY(-1px);
                    }

                    container-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                    }

                    .container-header .actions {
                        display: flex;
                        gap: 10px;
                    }

                    
                    .container-header h2 {
                        color: #333;
                        font-size: 24px;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    .btn-primary {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        padding: 10px 15px;
                        background-color: #3498db;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        text-decoration: none;
                        cursor: pointer;
                        font-size: 14px;
                    }

                    .btn-primary:hover {
                        background-color: #2980b9;
                    }


                    @media (max-width: 768px) {
                        body {
                            padding: 1rem;
                        }
                        
                        .card {
                            padding: 1rem;
                        }
                    }
                    </style>
                </head>
                <body>
                <header class="header">
                    <div>
                        <h1><i class="fas fa-building"></i> SysCondomínio</h1>
                        <p class="tagline">Gerenciamento de Condomínio</p>
                        <a href="/block/read" class="btn-primary"> Voltar </a>
                    </div>
                </header>
                <main class="container">
                    <section class="card">
                    <h2> Editar Bloco </h2>
                    <form action="/block/update/${id}" method="POST">
                        <div class="form-group">
                            <div class="input-group">
                                <label for="descricao">Descrição do Bloco:</label>
                                <input type="text" id="descricao" name="descricao" value="${result[0].descricao}" required>
                            </div>
                            
                            <div class="input-group">
                                <label for="descricao">Quantidade de Apartamentos:</label>
                                <textarea id="qtd_apartamentos" name="qtd_apartamentos">${result[0].qtd_apartamentos || ''}</textarea>
                            </div>
                            
                            <button type="submit">
                                <i class="fas fa-save"></i> Atualizar
                            </button>
                        </div>
                    </form>
                    </section>
                </main>
                </body>
            </html>
        `);
    })
});

app.post('/block/update/:id', function(req, res){
    const id = req.params.id;
    const { descricao, qtd_apartamentos } = req.body;
 
    const update = "UPDATE blocos SET descricao = ?, qtd_apartamentos = ? WHERE id = ?";
 
    db.query(update, [descricao, qtd_apartamentos, id], function(err, result){
        if(!err){
            console.log("Bloco editado com sucesso!");
            res.redirect('/block/read'); 
        }else{
            console.log("Erro ao editar o bloco ", err);
            res.send(`
                <html>
                    <body>
                        <h1>Erro ao editar bloco</h1>
                        <p>${err.message.includes('Duplicate') ? 'Já existe um bloco com este nome' : err.message}</p>
                        <a href="/block/update/${id}">Tentar novamente</a>
                    </body>
                </html>
            `);
        }
    });
});

app.get("/apartment/create", function(req, res) {
    const queryBlocos = "SELECT id, descricao FROM blocos ORDER BY descricao";
    
    db.query(queryBlocos, function(err, blocos) {
        if (err) {
            console.log("Erro ao buscar blocos:", err);
            return res.status(500).send("Erro ao carregar formulário");
        }

        res.send(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head> 
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>SysCondomínio - Cadastrar Apartamento</title>
                <link rel="stylesheet" href="/style.css">
                <link rel="stylesheet" href="/styleApartmentCreate.css">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            </head>
            <body>
                <div class="app-container">
                    <header class="app-header">
                        <div class="logo">
                            <i class="fas fa-building"></i>
                            <h1>SysCondomínio</h1>
                        </div>
                        <div class="user-area">
                            <span>Síndico</span>
                            <img src="/images/user-avatar.jpg" alt="Usuário">
                        </div>
                    </header>

                    <nav class="sidebar">
                        <ul class="menu">
                            <li><a href="/apartment/read" class="active"><i class="fas fa-door-open"></i> Voltar</a></li>
                        </ul>
                    </nav>

                    <main class="main-content">
                        <div class="page-header">
                            <h2><i class="fas fa-door-open"></i> Cadastrar Apartamento</h2>
                        </div>

                        <div class="form-container">
                            <div class="form-header">
                                <h3><i class="fas fa-plus-circle"></i> Novo Apartamento</h3>
                            </div>
                                <form method="POST" action="/apartment/create/apartment">
                                    <div class="form-group">
                                        <label for="bloco_id">Bloco:</label>
                                        <select id="bloco_id" name="bloco_id" required>
                                            <option value="">Selecione um bloco</option>
                                            ${blocos.map(bloco => `
                                                <option value="${bloco.id}">${bloco.descricao}</option>
                                            `).join('')}
                                        </select>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="numero">Número do Apartamento:</label>
                                        <input type="text" id="numero" name="numero" required>
                                    </div>
                                    
                                    <div class="form-actions">
                                        <button type="submit" class="btn-primary">
                                            <i class="fas fa-save"></i> Cadastrar
                                        </button>

                                    </div>
                                </form>
                        </div>
                    </main>
                </div>
            </body>
            </html>
        `);
    });
});

app.get("/apartment/read", function(req, res) {
    let searchTerm = req.query.search || "";
    let blocoId = req.query.bloco_id || "";
    
    
    let query = `SELECT a.*, b.descricao as bloco_descricao 
                FROM apartamentos a
                JOIN blocos b ON a.bloco_id = b.id
                WHERE 1=1`;
    
    let params = [];
    
    
    if (searchTerm) {
        query += ` AND (a.numero LIKE ? OR b.descricao LIKE ?)`;
        params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }
    
    if (blocoId) {
        query += ` AND a.bloco_id = ?`;
        params.push(blocoId);
    }
    
    query += ` ORDER BY b.descricao, a.numero`;
    
    db.query(query, params, function(err, rows) {
        if (!err) {
            console.log("Consulta de apartamentos realizada com sucesso!");

            res.send(`
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head> 
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>SysCondomínio - Apartamentos</title>
                    <link rel="stylesheet" href="/style.css">
                    <link rel="stylesheet" href="/styleBlockCreate.css">
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                </head>
                <body>
                    <div class="app-container">
                        <header class="app-header">
                            <div class="logo">
                                <i class="fas fa-building"></i>
                                <h1>SysCondomínio</h1>
                            </div>
                            <div class="user-area">
                                <span>Síndico</span>
                                <img src="/images/user-avatar.jpg" alt="Usuário">
                            </div>
                        </header>

                        <nav class="sidebar">
                            <ul class="menu">
                                <li><a href="/block/read"><i class="fas fa-search"></i> Pesquisa de Blocos</a></li>
                                <li><a href="/apartment/read"><i class="fas fa-search"></i> Pesquisa de Apartamentos</a></li>
                                <li><a href="/resident/read"><i class="fas fa-user-friends"></i> Pesquisa de Moradores</a></li>
                                <li><a href="/payment/create"><i class="fas fa-hand-holding-usd"></i> Registro de Pagamento</a></li>
                                <li><a href="/maintenance/create"><i class="fas fa-clipboard-list"></i> Registro de tipos de Manutenção</a></li>
                                <li><a href="/maintenance/register"><i class="fas fa-hammer"></i> Registrar Manutenção</a></li>
                            </ul>
                        </nav>

                        <main class="main-content">
                            <div class="page-header">
                                <h2><i class="fas fa-door-open"></i> Apartamentos Cadastrados</h2>
                                <div class="actions">
                                    <a href="/apartment/create" class="btn-primary">
                                        <i class="fas fa-plus"></i> Novo Apartamento
                                    </a>
                                    <a href='/' class="btn-primary">
                                        <i class="fas fa-backward"></i> Voltar
                                    </a>
                                </div>
                            </div>

                            <div class="search-container">
                                <div class="search-bar">
                                    <form method="GET" action="/apartment/read">
                                        ${blocoId ? `<input type="hidden" name="bloco_id" value="${blocoId}">` : ''}
                                        <input type="text" name="search" id="searchInput" placeholder="Pesquisar por número ou bloco..." value="${searchTerm}">
                                        <button type="submit" id="searchBtn" class="btn-icon">
                                            <i class="fas fa-search"></i>
                                        </button>
                                        ${searchTerm || blocoId ? `
                                            <a href="/apartment/read" class="btn-icon danger">
                                                <i class="fas fa-times"></i> Limpar
                                            </a>
                                        ` : ''}
                                    </form>
                                </div>
                            </div>

                            <div class="table-container">
                                ${rows.length > 0 ? `
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Bloco</th>
                                                <th>Número</th>
                                                <th>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${rows.map(row => `
                                                <tr>
                                                    <td>${row.id}</td>
                                                    <td>${row.bloco_descricao}</td>
                                                    <td>${row.numero}</td>
                                                    <td class="actions-cell">
                                                        <a href="/apartment/update/${row.id}" class="btn-icon" title="Alterar">
                                                            <i class="fas fa-edit"></i>
                                                        </a>
                                                        <a href="/apartment/delete/${row.id}" class="btn-icon danger" onclick="return confirm('Tem certeza que deseja excluir este Apartamento?')">
                                                        <i class="fas fa-trash"></i>
                                                    </a>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                ` : `
                                    <div class="no-results">
                                        <i class="fas fa-door-closed"></i>
                                        <p>Nenhum apartamento encontrado</p>
                                        ${searchTerm || blocoId ? `
                                            <a href="/apartment/read" class="btn-primary">
                                                <i class="fas fa-list"></i> Ver todos
                                            </a>
                                        ` : ''}
                                    </div>
                                `}
                            </div>
                        </main>
                    </div>
                </body>
                </html>
            `);
        } else {
            console.log("Erro ao consultar apartamentos:", err);
            res.send(`
                <html>
                    <head>
                        <title>Erro</title>
                        <link rel="stylesheet" href="/style.css">
                    </head>
                    <body class="error-page">
                        <div class="error-container">
                            <h1><i class="fas fa-exclamation-triangle"></i> Erro ao carregar apartamentos</h1>
                            <p>${err.message}</p>
                            <a href="/" class="btn-primary">
                                <i class="fas fa-home"></i> Voltar ao início
                            </a>
                        </div>
                    </body>
                </html>
            `);
        }
    });
});

app.post('/apartment/create/apartment', function(req, res) {
    const blocoId = req.body.bloco_id;
    const numero = req.body.numero;

    if (!blocoId || !numero) {
        return res.status(400).send("Todos os campos são obrigatórios");
    }

    const values = [blocoId, numero];
    const insert = "INSERT INTO apartamentos (bloco_id, numero) VALUES (?, ?)";

    db.query(insert, values, function(err, result) {
        if (!err) {
            console.log("Apartamento cadastrado com sucesso!");
            res.redirect("/apartment/read");
        } else {
            console.log("Erro ao cadastrar apartamento:", err);
            
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(400).send(`
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        Já existe um apartamento com este número no bloco selecionado.
                        <a href="/apartment/create" class="btn-primary">Tentar novamente</a>
                    </div>
                `);
            } else {
                res.status(500).send(`
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        Erro ao cadastrar apartamento. Por favor, tente novamente.
                        <a href="/apartment/create" class="btn-primary">Voltar</a>
                    </div>
                `);
            }
        }
    });
});

app.get('/apartment/delete/:id', function(req, res){
    const id = req.params.id;

    db.query('DELETE FROM apartamentos WHERE id = ?', [id], function(err, result){
        if (err) {
            console.log('Erro ao excluir o produto', err);
            res.status(500).send('Erro ao excluir o produto');
            return;
        }
    })
    console.log('Produto excluído com sucesso!');
    res.redirect('/apartment/read');
});

app.get('/apartment/update/:id', function(req, res){
    const id = req.params.id;
    const query = `
        SELECT a.*, b.descricao as bloco_descricao 
        FROM apartamentos a
        JOIN blocos b ON a.bloco_id = b.id
        WHERE a.id = ?`;
    
    db.query(query, [id], function(err, result){
        if (err) {
            console.log('Erro ao editar o apartamento', err);
            res.status(500).send('Erro ao editar o apartamento');
            return;
        }
        
  
        db.query('SELECT id, descricao FROM blocos ORDER BY descricao', function(err, blocos){
            if (err) {
                console.log('Erro ao buscar blocos', err);
                res.status(500).send('Erro ao carregar formulário');
                return;
            }
            
            res.send(`
                <html>
                    <head> 
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>SysCondomínio - Editar Apartamento</title>
                        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                        <style>
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }

                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            background-color: #f5f7fa;
                            color: #263238;
                            line-height: 1.6;
                            min-height: 100vh;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            padding: 2rem;
                        }

                        .header {
                            width: 100%;
                            max-width: 1200px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 2rem;
                        }

                        .container {
                            width: 100%;
                            max-width: 1200px;
                            display: flex;
                            flex-direction: column;
                            gap: 2rem;
                        }

                        h1 {
                            color: #1e88e5;
                            font-size: 2.5rem;
                            margin-bottom: 0.5rem;
                        }

                        h2 {
                            color: #1565c0;
                            font-size: 1.8rem;
                            margin-bottom: 1rem;
                        }

                        .card {
                            background-color: #ffffff;
                            border-radius: 8px;
                            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                            padding: 2rem;
                            margin-bottom: 1rem;
                            width: 100%;
                            max-width: 600px;
                        }

                        .form-group {
                            display: flex;
                            flex-direction: column;
                            gap: 1.5rem;
                        }

                        .form-row {
                            display: grid;
                            grid-template-columns: 1fr;
                            gap: 1rem;
                        }

                        .input-group {
                            display: flex;
                            flex-direction: column;
                            gap: 0.5rem;
                        }

                        label {
                            font-weight: 500;
                            color: #1565c0;
                        }

                        input, select, textarea {
                            padding: 0.75rem;
                            border: 1px solid #e0e0e0;
                            border-radius: 4px;
                            font-size: 1rem;
                            background-color: #ffffff;
                            color: #263238;
                            width: 100%;
                        }

                        select {
                            appearance: none;
                            background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
                            background-repeat: no-repeat;
                            background-position: right 0.75rem center;
                            background-size: 1rem;
                        }

                        input:focus,
                        select:focus,
                        textarea:focus {
                            outline: none;
                            border-color: #1e88e5;
                            box-shadow: 0 0 0 2px rgba(30, 136, 229, 0.2);
                        }

                        button {
                            padding: 0.75rem 1.5rem;
                            background-color: #1e88e5;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            font-size: 1rem;
                            font-weight: 500;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            margin-top: 1rem;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            gap: 0.5rem;
                        }

                        button:hover {
                            background-color: #1565c0;
                            transform: translateY(-1px);
                        }

                        .btn-secondary {
                            background-color: #f5f7fa;
                            padding: 0.75rem 1.5rem;
                            background-color: #263238;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            font-size: 1rem;
                            font-weight: 500;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            margin-top: 1rem;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            gap: 0.5rem;
                        }

                        .btn-secondary:hover {
                            background-color: #e0e0e0;
                        }

                        .btn-group {
                            display: flex;
                            gap: 1rem;
                            margin-top: 1.5rem;
                        }

                        @media (max-width: 768px) {
                            body {
                                padding: 1rem;
                            }
                            
                            .card {
                                padding: 1rem;
                            }
                            
                            .btn-group {
                                flex-direction: column;
                            }
                        }
                        </style>
                    </head>
                    <body>
                    <header class="header">
                        <div>
                            <h1><i class="fas fa-building"></i> SysCondomínio</h1>
                            <p class="tagline">Gerenciamento de Condomínio</p>
                        </div>
                    </header>
                    <main class="container">
                        <section class="card">
                        <h2><i class="fas fa-door-open"></i> Editar Apartamento</h2>
                        <form action="/apartment/update/${id}" method="POST">
                            <div class="form-group">
                                <div class="input-group">
                                    <label for="bloco_id">Bloco:</label>
                                    <select id="bloco_id" name="bloco_id" required>
                                        <option value="">Selecione um bloco</option>
                                        ${blocos.map(bloco => `
                                            <option value="${bloco.id}" ${bloco.id == result[0].bloco_id ? 'selected' : ''}>
                                                ${bloco.descricao}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                
                                <div class="input-group">
                                    <label for="numero">Número do Apartamento:</label>
                                    <input type="text" id="numero" name="numero" value="${result[0].numero}" required>
                                </div>
                                
                                <div class="btn-group">
                                    <button type="submit">
                                        <i class="fas fa-save"></i> Atualizar
                                    </button>
                                    <a href="/apartment/read" class="btn-secondary" style="text-decoration: none;">
                                        <i class="fas fa-times"></i> Cancelar
                                    </a>
                                </div>
                            </div>
                        </form>
                        </section>
                    </main>
                    </body>
                </html>
            `);
        });
    });
});

app.post('/apartment/update/:id', function(req, res){
    const id = req.params.id;
    const { bloco_id, numero } = req.body;
 
    const update = "UPDATE apartamentos SET bloco_id = ?, numero = ? WHERE id = ?";
 
    db.query(update, [bloco_id, numero, id], function(err, result){
        if(!err){
            console.log("Apartamento editado com sucesso!");
            res.redirect('/apartment/read'); 
        }else{
            console.log("Erro ao editar o apartamento ", err);
            
            const errorMessage = err.code === 'ER_DUP_ENTRY' 
                ? 'Já existe um apartamento com este número no bloco selecionado'
                : err.message;
            
            res.send(`
                <html>
                    <head>
                        <title>Erro ao Editar Apartamento</title>
                        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                        <style>
                            body {
                                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                background-color: #f5f7fa;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100vh;
                                margin: 0;
                                padding: 2rem;
                            }
                            .error-container {
                                background-color: #fff;
                                border-radius: 8px;
                                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                                padding: 2rem;
                                max-width: 500px;
                                text-align: center;
                            }
                            h1 {
                                color: #e53935;
                                margin-bottom: 1rem;
                            }
                            p {
                                margin-bottom: 2rem;
                                color: #263238;
                            }
                            a {
                                display: inline-flex;
                                align-items: center;
                                gap: 0.5rem;
                                padding: 0.75rem 1.5rem;
                                background-color: #1e88e5;
                                color: white;
                                text-decoration: none;
                                border-radius: 4px;
                                transition: all 0.2s ease;
                            }
                            a:hover {
                                background-color: #1565c0;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="error-container">
                            <h1><i class="fas fa-exclamation-circle"></i> Erro ao Editar Apartamento</h1>
                            <p>${errorMessage}</p>
                            <a href="/apartment/update/${id}">
                                <i class="fas fa-arrow-left"></i> Tentar Novamente
                            </a>
                        </div>
                    </body>
                </html>
            `);
        }
    });
});

app.get("/resident/read", function(req, res) {
    let searchTerm = req.query.search || "";
    
    let query = `SELECT m.*, 
                a.numero as apartamento_numero,
                b.descricao as bloco_descricao
                FROM moradores m
                JOIN apartamentos a ON m.apartamento_id = a.id
                JOIN blocos b ON a.bloco_id = b.id
                WHERE 1=1`;
    
    let params = [];
    
    if (searchTerm) {
        query += ` AND (m.nome LIKE ? OR m.cpf LIKE ? OR a.numero LIKE ? OR b.descricao LIKE ?)`;
        params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
    }
    
    query += ` ORDER BY b.descricao, a.numero, m.nome`;
    
    db.query(query, params, function(err, rows) {
        if (!err) {
            console.log("Consulta de moradores realizada com sucesso!");

            res.send(`
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head> 
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>SysCondomínio - Moradores</title>
                    <link rel="stylesheet" href="/style.css">
                    <link rel="stylesheet" href="/styleBlockCreate.css">
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                </head>
                <body>
                    <div class="app-container">
                        <header class="app-header">
                            <div class="logo">
                                <i class="fas fa-building"></i>
                                <h1>SysCondomínio</h1>
                            </div>
                            <div class="user-area">
                                <span>Síndico</span>
                                <img src="/images/user-avatar.jpg" alt="Usuário">
                            </div>
                        </header>

                        <nav class="sidebar">
                            <ul class="menu">
                                <li><a href="/block/read"><i class="fas fa-search"></i> Pesquisa de Blocos</a></li>
                                <li><a href="/apartment/read"><i class="fas fa-search"></i> Pesquisa de Apartamentos</a></li>
                                <li><a href="/resident/read"><i class="fas fa-user-friends"></i> Pesquisa de Moradores</a></li>
                                <li><a href="/payment/create"><i class="fas fa-hand-holding-usd"></i> Registro de Pagamento</a></li>
                                <li><a href="/maintenance/create"><i class="fas fa-clipboard-list"></i> Registro de tipos de Manutenção</a></li>
                                <li><a href="/maintenance/register"><i class="fas fa-hammer"></i> Registrar Manutenção</a></li>
                            </ul>
                        </nav>

                        <main class="main-content">
                            <div class="page-header">
                                <h2><i class="fas fa-users"></i> Moradores Cadastrados</h2>
                                <div class="actions">
                                    <a href="/resident/create" class="btn-primary">
                                        <i class="fas fa-plus"></i> Novo Morador
                                    </a>
                                    <a href="/" class="btn-primary">
                                        <i class="fas fa-backward"></i> Voltar
                                    </a>
                                </div>
                            </div>

                            <div class="search-container">
                                <div class="search-bar">
                                    <form method="GET" action="/resident/read">
                                        <input type="text" name="search" id="searchInput" placeholder="Pesquisar por nome, CPF, apartamento ou bloco..." value="${searchTerm}">
                                        <button type="submit" id="searchBtn" class="btn-icon">
                                            <i class="fas fa-search"></i>
                                        </button>
                                        ${searchTerm ? `
                                            <a href="/resident/read" class="btn-icon danger">
                                                <i class="fas fa-times"></i> Limpar
                                            </a>
                                        ` : ''}
                                    </form>
                                </div>
                            </div>

                            <div class="table-container">
                                ${rows.length > 0 ? `
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>CPF</th>
                                                <th>Nome</th>
                                                <th>Apartamento</th>
                                                <th>Bloco</th>
                                                <th>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${rows.map(row => `
                                                <tr>
                                                    <td>${row.cpf}</td>
                                                    <td>${row.nome}</td>
                                                    <td>${row.apartamento_numero}</td>
                                                    <td>${row.bloco_descricao}</td>
                                                    <td class="actions-cell">
                                                        <a href="/resident/update/${row.id}" class="btn-icon" title="Alterar">
                                                            <i class="fas fa-edit"></i>
                                                        </a>
                                                        <a href="/resident/delete/${row.id}" class="btn-icon danger" onclick="return confirm('Tem certeza que deseja excluir este morador?')">
                                                            <i class="fas fa-trash"></i>
                                                        </a>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                ` : `
                                    <div class="no-results">
                                        <i class="fas fa-user-slash"></i>
                                        <p>Nenhum morador encontrado</p>
                                        ${searchTerm ? `
                                            <a href="/resident/read" class="btn-primary">
                                                <i class="fas fa-list"></i> Ver todos
                                            </a>
                                        ` : ''}
                                    </div>
                                `}
                            </div>
                        </main>
                    </div>
                </body>
                </html>
            `);
        } else {
            console.log("Erro ao consultar moradores:", err);
            res.send(`
                <html>
                    <head>
                        <title>Erro</title>
                        <link rel="stylesheet" href="/style.css">
                    </head>
                    <body class="error-page">
                        <div class="error-container">
                            <h1><i class="fas fa-exclamation-triangle"></i> Erro ao carregar moradores</h1>
                            <p>${err.message}</p>
                            <a href="/" class="btn-primary">
                                <i class="fas fa-home"></i> Voltar ao início
                            </a>
                        </div>
                    </body>
                </html>
            `);
        }
    });
});

app.get('/resident/create', function(req, res) {
    const queryApartamentos = `
        SELECT a.id, a.numero, b.descricao as bloco_descricao 
        FROM apartamentos a
        JOIN blocos b ON a.bloco_id = b.id
        ORDER BY b.descricao, a.numero
    `;
    
    db.query(queryApartamentos, function(err, apartamentos) {
        if (err) {
            console.log("Erro ao buscar apartamentos:", err);
            return res.status(500).send("Erro ao carregar formulário");
        }

        res.send(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head> 
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>SysCondomínio - Cadastrar Morador</title>
                <link rel="stylesheet" href="/style.css">
                <link rel="stylesheet" href="/styleResidentCreate.css">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                <script>
                    function toggleVehicleFields() {
                        const hasVehicle = document.getElementById('possui_veiculo').checked;
                        const vehicleFields = document.getElementById('vehicle-fields');
                        const garageFields = document.getElementById('garage-fields');
                        
                        vehicleFields.style.display = hasVehicle ? 'block' : 'none';
                        garageFields.style.display = hasVehicle ? 'block' : 'none';
                    }
                </script>
            </head>
            <body>
                <div class="app-container">
                    <header class="app-header">
                        <div class="logo">
                            <i class="fas fa-building"></i>
                            <h1>SysCondomínio</h1>
                        </div>
                        <div class="user-area">
                            <span>Síndico</span>
                            <img src="/images/user-avatar.jpg" alt="Usuário">
                        </div>
                    </header>

                    <nav class="sidebar">
                        <ul class="menu">
                            <li><a href="/resident/read"><i class="fas fa-cube"></i> Voltar</a></li>
                        </ul>
                    </nav>

                    <main class="main-content">
                        <div class="page-header">
                            <h2><i class="fas fa-user-plus"></i> Cadastrar Morador</h2>
                            <div class="actions">
                                <a href="/resident/read" class="btn-primary">
                                    <i class="fas fa-list"></i> Lista de Moradores
                                </a>
                            </div>
                        </div>

                        <div class="form-container">
                            <form method="POST" action="/resident/create/resident">
                                <div class="form-group">
                                    <label for="cpf">CPF:</label>
                                    <input type="text" id="cpf" name="cpf" required placeholder="000.000.000-00">
                                </div>
                                
                                <div class="form-group">
                                    <label for="nome">Nome:</label>
                                    <input type="text" id="nome" name="nome" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="telefone">Telefone:</label>
                                    <input type="text" id="telefone" name="telefone" placeholder="(00) 00000-0000">
                                </div>
                                
                                <div class="form-group">
                                    <label for="apartamento_id">Apartamento:</label>
                                    <select id="apartamento_id" name="apartamento_id" required>
                                        <option value="">Selecione um apartamento</option>
                                        ${apartamentos.map(apto => `
                                            <option value="${apto.id}">Bloco ${apto.bloco_descricao} - Apt ${apto.numero}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label>Responsável pelo apartamento?</label>
                                    <div class="radio-group">
                                        <label>
                                            <input type="radio" name="responsavel" value="on"> Sim
                                        </label>
                                        <label>
                                            <input type="radio" name="responsavel" value="off" checked> Não
                                        </label>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label>Proprietário do apartamento?</label>
                                    <div class="radio-group">
                                        <label>
                                            <input type="radio" name="proprietario" value="on"> Sim
                                        </label>
                                        <label>
                                            <input type="radio" name="proprietario" value="off" checked> Não
                                        </label>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="possui_veiculo">Possui veículo?</label>
                                    <input type="checkbox" id="possui_veiculo" name="possui_veiculo" onchange="toggleVehicleFields()">
                                </div>
                                
                                <div id="garage-fields" style="display: none;">
                                    <div class="form-group">
                                        <label for="vagas_garagem">Quantidade de vagas de garagem:</label>
                                        <input type="number" id="vagas_garagem" name="vagas_garagem" min="0" value="0">
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="numero_vaga">Número da vaga:</label>
                                        <input type="text" id="numero_vaga" name="numero_vaga">
                                    </div>
                                </div>
                                
                                <div id="vehicle-fields" style="display: none;">
                                    <h3><i class="fas fa-car"></i> Cadastrar Veículo</h3>
                                    
                                    <div class="form-group">
                                        <label for="placa">Placa:</label>
                                        <input type="text" id="placa" name="placa" placeholder="AAA-0000">
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="marca">Marca:</label>
                                        <input type="text" id="marca" name="marca">
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="modelo">Modelo:</label>
                                        <input type="text" id="modelo" name="modelo">
                                    </div>
                                </div>
                                
                                <div class="form-actions">
                                    <button type="submit" class="btn-primary">
                                        <i class="fas fa-save"></i> Cadastrar
                                    </button>
                                    <a href="/resident/read" class="btn-secondary">
                                        <i class="fas fa-times"></i> Cancelar
                                    </a>
                                </div>
                            </form>
                        </div>
                    </main>
                </div>
            </body>
            </html>
        `);
    });
});

app.post('/resident/create/resident', function(req, res) {
    const { 
        cpf, 
        nome, 
        telefone, 
        apartamento_id, 
        responsavel, 
        proprietario,
        possui_veiculo,
        vagas_garagem,
        numero_vaga,
        placa,
        marca,
        modelo
    } = req.body;

    if (!cpf || !nome || !apartamento_id) {
        return res.status(400).send("CPF, Nome e Apartamento são campos obrigatórios");
    }

    const isResponsavel = responsavel === 'on';
    const isProprietario = proprietario === 'on';
    const hasVehicle = possui_veiculo === 'on';

    db.beginTransaction(function(err) {
        if (err) {
            console.log("Erro ao iniciar transação:", err);
            return res.status(500).send("Erro no servidor");
        }


        const insertMorador = `
            INSERT INTO moradores 
            (cpf, nome, telefone, apartamento_id, responsavel, proprietario, vagas_garagem) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const moradorValues = [
            cpf, 
            nome, 
            telefone, 
            apartamento_id, 
            isResponsavel, 
            isProprietario,
            vagas_garagem || 0
        ];

        db.query(insertMorador, moradorValues, function(err, result) {
            if (err) {
                return db.rollback(function() {
                    console.log("Erro ao cadastrar morador:", err);
                    
                    if (err.code === 'ER_DUP_ENTRY') {
                        res.status(400).send(`
                            <div class="error-message">
                                <i class="fas fa-exclamation-circle"></i>
                                Já existe um morador cadastrado com este CPF.
                                <a href="/resident/create" class="btn-primary">Tentar novamente</a>
                            </div>
                        `);
                    } else {
                        res.status(500).send(`
                            <div class="error-message">
                                <i class="fas fa-exclamation-circle"></i>
                                Erro ao cadastrar morador. Por favor, tente novamente.
                                <a href="/resident/create" class="btn-primary">Voltar</a>
                            </div>
                        `);
                    }
                });
            }

            if (hasVehicle && placa) {
                const insertVeiculo = `
                    INSERT INTO veiculos 
                    (morador_id, placa, marca, modelo, vaga) 
                    VALUES (?, ?, ?, ?, ?)
                `;
                
                const veiculoValues = [
                    result.insertId, 
                    placa,
                    marca,
                    modelo,
                    numero_vaga
                ];

                db.query(insertVeiculo, veiculoValues, function(err) {
                    if (err) {
                        return db.rollback(function() {
                            console.log("Erro ao cadastrar veículo:", err);
                            
                            if (err.code === 'ER_DUP_ENTRY') {
                                res.status(400).send(`
                                    <div class="error-message">
                                        <i class="fas fa-exclamation-circle"></i>
                                        Já existe um veículo cadastrado com esta placa.
                                        <a href="/resident/create" class="btn-primary">Tentar novamente</a>
                                    </div>
                                `);
                            } else {
                                res.status(500).send(`
                                    <div class="error-message">
                                        <i class="fas fa-exclamation-circle"></i>
                                        Morador cadastrado, mas erro ao cadastrar veículo. Por favor, edite o morador para adicionar o veículo.
                                        <a href="/resident/read" class="btn-primary">Lista de Moradores</a>
                                    </div>
                                `);
                            }
                        });
                    }
                    db.commit(function(err) {
                        if (err) {
                            return db.rollback(function() {
                                console.log("Erro ao fazer commit:", err);
                                res.status(500).send(`
                                    <div class="error-message">
                                        <i class="fas fa-exclamation-circle"></i>
                                        Erro ao finalizar cadastro. Por favor, verifique os dados.
                                        <a href="/resident/read" class="btn-primary">Lista de Moradores</a>
                                    </div>
                                `);
                            });
                        }

                        console.log("Morador e veículo cadastrados com sucesso!");
                        res.redirect("/resident/read");
                    });
                });
            } else {
                db.commit(function(err) {
                    if (err) {
                        return db.rollback(function() {
                            console.log("Erro ao fazer commit:", err);
                            res.status(500).send(`
                                <div class="error-message">
                                    <i class="fas fa-exclamation-circle"></i>
                                    Erro ao finalizar cadastro.
                                    <a href="/resident/read" class="btn-primary">Lista de Moradores</a>
                                </div>
                            `);
                        });
                    }

                    console.log("Morador cadastrado com sucesso!");
                    res.redirect("/resident/read");
                });
            }
        });
    });
});

app.get('/resident/delete/:id', function(req, res){
    const id = req.params.id;

    db.query('DELETE FROM veiculos WHERE morador_id = ?', [id], function(err, result){
        if (err) {
            console.log('Erro ao excluir o produto', err);
            res.status(500).send('Erro ao excluir o produto');
            return;
        }
    })

    db.query('DELETE FROM moradores WHERE id = ?', [id], function(err, result){
        if (err) {
            console.log('Erro ao excluir o produto', err);
            res.status(500).send('Erro ao excluir o produto');
            return;
        }
    })
    console.log('Produto excluído com sucesso!');
    res.redirect('/resident/read');
});

app.get('/resident/update/:id', function(req, res) {
    const id = req.params.id;
    const queryMorador = `
        SELECT m.*, a.numero as apartamento_numero, b.descricao as bloco_descricao 
        FROM moradores m
        JOIN apartamentos a ON m.apartamento_id = a.id
        JOIN blocos b ON a.bloco_id = b.id
        WHERE m.id = ?`;
    
    db.query(queryMorador, [id], function(err, moradorResult) {
        if (err) {
            console.log('Erro ao buscar morador', err);
            return res.status(500).send('Erro ao carregar formulário de edição');
        }
        
        if (moradorResult.length === 0) {
            return res.status(404).send('Morador não encontrado');
        }
        
        const morador = moradorResult[0];
        
        db.query('SELECT * FROM veiculos WHERE morador_id = ?', [id], function(err, veiculosResult) {
            if (err) {
                console.log('Erro ao buscar veículos', err);
                return res.status(500).send('Erro ao carregar veículos');
            }
            
            const queryApartamentos = `
                SELECT a.id, a.numero, b.descricao as bloco_descricao 
                FROM apartamentos a
                JOIN blocos b ON a.bloco_id = b.id
                ORDER BY b.descricao, a.numero`;
            
            db.query(queryApartamentos, function(err, apartamentosResult) {
                if (err) {
                    console.log('Erro ao buscar apartamentos', err);
                    return res.status(500).send('Erro ao carregar formulário');
                }
                
                res.send(`
                    <!DOCTYPE html>
                    <html lang="pt-BR">
                    <head> 
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>SysCondomínio - Editar Morador</title>
                        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                        <style>
                            * {
                                margin: 0;
                                padding: 0;
                                box-sizing: border-box;
                            }

                            body {
                                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                background-color: #f5f7fa;
                                color: #263238;
                                line-height: 1.6;
                                min-height: 100vh;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                padding: 2rem;
                            }

                            .header {
                                width: 100%;
                                max-width: 1200px;
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                margin-bottom: 2rem;
                            }

                            .container {
                                width: 100%;
                                max-width: 1200px;
                                display: flex;
                                flex-direction: column;
                                gap: 2rem;
                            }

                            h1 {
                                color: #1e88e5;
                                font-size: 2.5rem;
                                margin-bottom: 0.5rem;
                            }

                            h2 {
                                color: #1565c0;
                                font-size: 1.8rem;
                                margin-bottom: 1rem;
                            }

                            .card {
                                background-color: #ffffff;
                                border-radius: 8px;
                                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                                padding: 2rem;
                                margin-bottom: 1rem;
                                width: 100%;
                            }

                            .form-group {
                                display: flex;
                                flex-direction: column;
                                gap: 1.5rem;
                            }

                            .form-row {
                                display: grid;
                                grid-template-columns: 1fr 1fr;
                                gap: 1rem;
                            }

                            @media (max-width: 768px) {
                                .form-row {
                                    grid-template-columns: 1fr;
                                }
                            }

                            .input-group {
                                display: flex;
                                flex-direction: column;
                                gap: 0.5rem;
                            }

                            label {
                                font-weight: 500;
                                color: #1565c0;
                            }

                            input, select, textarea {
                                padding: 0.75rem;
                                border: 1px solid #e0e0e0;
                                border-radius: 4px;
                                font-size: 1rem;
                                background-color: #ffffff;
                                color: #263238;
                                width: 100%;
                            }

                            select {
                                appearance: none;
                                background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
                                background-repeat: no-repeat;
                                background-position: right 0.75rem center;
                                background-size: 1rem;
                            }

                            input:focus,
                            select:focus,
                            textarea:focus {
                                outline: none;
                                border-color: #1e88e5;
                                box-shadow: 0 0 0 2px rgba(30, 136, 229, 0.2);
                            }

                            .radio-group {
                                display: flex;
                                gap: 1rem;
                                margin-top: 0.5rem;
                            }

                            .radio-group label {
                                display: flex;
                                align-items: center;
                                gap: 0.5rem;
                                font-weight: normal;
                                cursor: pointer;
                            }

                            .checkbox-group {
                                display: flex;
                                align-items: center;
                                gap: 0.5rem;
                                margin-top: 0.5rem;
                            }

                            .checkbox-group input {
                                width: auto;
                            }

                            .vehicle-card {
                                background-color: #f8f9fa;
                                border-radius: 6px;
                                padding: 1rem;
                                margin-top: 1rem;
                                border: 1px solid #e0e0e0;
                            }

                            .vehicle-header {
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                margin-bottom: 0.5rem;
                            }

                            .vehicle-title {
                                font-weight: 500;
                                color: #1e88e5;
                            }

                            .btn-delete-vehicle {
                                background: none;
                                border: none;
                                color: #e53935;
                                cursor: pointer;
                                font-size: 1rem;
                            }

                            button {
                                padding: 0.75rem 1.5rem;
                                background-color: #1e88e5;
                                color: white;
                                border: none;
                                border-radius: 4px;
                                font-size: 1rem;
                                font-weight: 500;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                margin-top: 1rem;
                                display: inline-flex;
                                align-items: center;
                                justify-content: center;
                                gap: 0.5rem;
                            }

                            button:hover {
                                background-color: #1565c0;
                                transform: translateY(-1px);
                            }

                            .btn-secondary {
                                background-color: #f5f7fa;
                                padding: 0.75rem 1.5rem;
                                background-color: #263238;
                                color: white;
                                border: none;
                                border-radius: 4px;
                                font-size: 1rem;
                                font-weight: 500;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                margin-top: 1rem;
                                display: inline-flex;
                                align-items: center;
                                justify-content: center;
                                gap: 0.5rem;
                            }

                            .btn-secondary:hover {
                                background-color: #e0e0e0;
                            }

                            .btn-group {
                                display: flex;
                                gap: 1rem;
                                margin-top: 1.5rem;
                            }

                            .btn-add-vehicle {
                                background-color: #1e88e5;
                                margin-top: 0;
                            }

                            .btn-add-vehicle:hover {
                                background-color: #1565c0;
                            }

                            @media (max-width: 768px) {
                                body {
                                    padding: 1rem;
                                }
                                
                                .card {
                                    padding: 1rem;
                                }
                                
                                .btn-group {
                                    flex-direction: column;
                                }
                            }
                        </style>
                        <script>
                            function toggleVehicleFields() {
                                const vehicleFields = document.getElementById('vehicle-fields');
                                vehicleFields.style.display = vehicleFields.style.display === 'none' ? 'block' : 'none';
                            }
                            
                            function confirmDelete(vehicleId) {
                                if (confirm('Tem certeza que deseja excluir este veículo?')) {
                                    window.location.href = '/resident/delete-vehicle/' + vehicleId;
                                }
                            }
                        </script>
                    </head>
                    <body>
                        <header class="header">
                            <div>
                                <h1><i class="fas fa-building"></i> SysCondomínio</h1>
                                <p class="tagline">Gerenciamento de Condomínio</p>
                            </div>
                        </header>
                        <main class="container">
                            <section class="card">
                                <h2><i class="fas fa-user-edit"></i> Editar Morador</h2>
                                <form action="/resident/update/${id}" method="POST">
                                    <div class="form-group">
                                        <div class="form-row">
                                            <div class="input-group">
                                                <label for="cpf">CPF:</label>
                                                <input type="text" id="cpf" name="cpf" value="${morador.cpf}" required placeholder="000.000.000-00">
                                            </div>
                                            
                                            <div class="input-group">
                                                <label for="nome">Nome:</label>
                                                <input type="text" id="nome" name="nome" value="${morador.nome}" required>
                                            </div>
                                        </div>
                                        
                                        <div class="form-row">
                                            <div class="input-group">
                                                <label for="telefone">Telefone:</label>
                                                <input type="text" id="telefone" name="telefone" value="${morador.telefone || ''}" placeholder="(00) 00000-0000">
                                            </div>
                                            
                                            <div class="input-group">
                                                <label for="apartamento_id">Apartamento:</label>
                                                <select id="apartamento_id" name="apartamento_id" required>
                                                    <option value="">Selecione um apartamento</option>
                                                    ${apartamentosResult.map(apto => `
                                                        <option value="${apto.id}" ${apto.id == morador.apartamento_id ? 'selected' : ''}>
                                                             ${apto.bloco_descricao} - Apt ${apto.numero}
                                                        </option>
                                                    `).join('')}
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div class="form-row">
                                            <div class="input-group">
                                                <label>Responsável pelo apartamento?</label>
                                                <div class="radio-group">
                                                    <label>
                                                        <input type="radio" name="responsavel" value="on" ${morador.responsavel ? 'checked' : ''}> Sim
                                                    </label>
                                                    <label>
                                                        <input type="radio" name="responsavel" value="off" ${!morador.responsavel ? 'checked' : ''}> Não
                                                    </label>
                                                </div>
                                            </div>
                                            
                                            <div class="input-group">
                                                <label>Proprietário do apartamento?</label>
                                                <div class="radio-group">
                                                    <label>
                                                        <input type="radio" name="proprietario" value="on" ${morador.proprietario ? 'checked' : ''}> Sim
                                                    </label>
                                                    <label>
                                                        <input type="radio" name="proprietario" value="off" ${!morador.proprietario ? 'checked' : ''}> Não
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="form-row">
                                            <div class="input-group">
                                                <label for="vagas_garagem">Vagas de Garagem:</label>
                                                <input type="number" id="vagas_garagem" name="vagas_garagem" min="0" value="${morador.vagas_garagem || 0}">
                                            </div>
                                        </div>
                                        
                                        <h3><i class="fas fa-car"></i> Veículos</h3>
                                        
                                        ${veiculosResult.length > 0 ? 
                                            veiculosResult.map(veiculo => `
                                                <div class="vehicle-card">
                                                    <div class="vehicle-header">
                                                        <span class="vehicle-title">${veiculo.marca} ${veiculo.modelo} - ${veiculo.placa}</span>
                                                        <button type="button" class="btn-delete-vehicle" onclick="confirmDelete(${veiculo.id})">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                    <div class="form-row">
                                                        <div class="input-group">
                                                            <label>Placa:</label>
                                                            <input type="text" value="${veiculo.placa}" readonly>
                                                        </div>
                                                        <div class="input-group">
                                                            <label>Vaga:</label>
                                                            <input type="text" value="${veiculo.vaga || ''}" readonly>
                                                        </div>
                                                    </div>
                                                </div>
                                            `).join('') : 
                                            '<p>Nenhum veículo cadastrado</p>'
                                        }
                                        
                                        <button type="button" class="btn-add-vehicle" onclick="toggleVehicleFields()">
                                            <i class="fas fa-plus"></i> Adicionar Veículo
                                        </button>
                                        
                                        <div id="vehicle-fields" style="display: none;">
                                            <div class="form-row">
                                                <div class="input-group">
                                                    <label for="placa">Placa:</label>
                                                    <input type="text" id="placa" name="placa" placeholder="AAA-0000">
                                                </div>
                                                
                                                <div class="input-group">
                                                    <label for="marca">Marca:</label>
                                                    <input type="text" id="marca" name="marca">
                                                </div>
                                            </div>
                                            
                                            <div class="form-row">
                                                <div class="input-group">
                                                    <label for="modelo">Modelo:</label>
                                                    <input type="text" id="modelo" name="modelo">
                                                </div>
                                                
                                                <div class="input-group">
                                                    <label for="numero_vaga">Número da Vaga:</label>
                                                    <input type="text" id="numero_vaga" name="numero_vaga">
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="btn-group">
                                            <button type="submit">
                                                <i class="fas fa-save"></i> Atualizar
                                            </button>
                                            <a href="/resident/read" class="btn-secondary" style="text-decoration: none;">
                                                <i class="fas fa-times"></i> Cancelar
                                            </a>
                                        </div>
                                    </div>
                                </form>
                            </section>
                        </main>
                    </body>
                    </html>
                `);
            });
        });
    });
});

app.post('/resident/update/:id', function(req, res) {
    const id = req.params.id;
    const { 
        cpf, 
        nome, 
        telefone, 
        apartamento_id, 
        responsavel, 
        proprietario,
        vagas_garagem,
        placa,
        marca,
        modelo,
        numero_vaga
    } = req.body;

    if (!cpf || !nome || !apartamento_id) {
        return res.status(400).send("CPF, Nome e Apartamento são campos obrigatórios");
    }

    const isResponsavel = responsavel === 'on';
    const isProprietario = proprietario === 'on';
    const hasVehicle = placa && marca && modelo;

    db.beginTransaction(function(err) {
        if (err) {
            console.log("Erro ao iniciar transação:", err);
            return res.status(500).send(`
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    Erro ao iniciar processo de atualização.
                    <a href="/resident/update/${id}" class="btn-primary">Tentar novamente</a>
                </div>
            `);
        }

        const updateMorador = `
            UPDATE moradores 
            SET 
                cpf = ?, 
                nome = ?, 
                telefone = ?, 
                apartamento_id = ?, 
                responsavel = ?, 
                proprietario = ?,
                vagas_garagem = ?
            WHERE id = ?
        `;
        
        const moradorValues = [
            cpf, 
            nome, 
            telefone, 
            apartamento_id, 
            isResponsavel, 
            isProprietario,
            vagas_garagem || 0,
            id
        ];

        db.query(updateMorador, moradorValues, function(err, result) {
            if (err) {
                return db.rollback(function() {
                    console.log("Erro ao atualizar morador:", err);
                    
                    let errorMessage = "Erro ao atualizar morador. Por favor, tente novamente.";
                    
                    if (err.code === 'ER_DUP_ENTRY') {
                        if (err.sqlMessage.includes('cpf')) {
                            errorMessage = "Já existe um morador cadastrado com este CPF.";
                        } else if (err.sqlMessage.includes('apartamento_id')) {
                            errorMessage = "Erro na relação com apartamento. Verifique os dados.";
                        }
                    }
                    
                    res.status(500).send(`
                        <div class="error-message">
                            <i class="fas fa-exclamation-circle"></i>
                            ${errorMessage}
                            <a href="/resident/update/${id}" class="btn-primary">Tentar novamente</a>
                        </div>
                    `);
                });
            }

            if (hasVehicle) {
                const checkVeiculo = 'SELECT id FROM veiculos WHERE morador_id = ? AND placa = ?';
                
                db.query(checkVeiculo, [id, placa], function(err, existingVeiculo) {
                    if (err) {
                        return db.rollback(function() {
                            console.log("Erro ao verificar veículo:", err);
                            res.status(500).send(`
                                <div class="error-message">
                                    <i class="fas fa-exclamation-circle"></i>
                                    Erro ao verificar veículo existente.
                                    <a href="/resident/update/${id}" class="btn-primary">Tentar novamente</a>
                                </div>
                            `);
                        });
                    }

                    if (existingVeiculo.length > 0) {
                        const updateVeiculo = `
                            UPDATE veiculos 
                            SET 
                                marca = ?, 
                                modelo = ?, 
                                vaga = ?
                            WHERE id = ?
                        `;
                        
                        db.query(updateVeiculo, [marca, modelo, numero_vaga, existingVeiculo[0].id], function(err) {
                            if (err) {
                                return db.rollback(function() {
                                    console.log("Erro ao atualizar veículo:", err);
                                    res.status(500).send(`
                                        <div class="error-message">
                                            <i class="fas fa-exclamation-circle"></i>
                                            Erro ao atualizar veículo.
                                            <a href="/resident/update/${id}" class="btn-primary">Tentar novamente</a>
                                        </div>
                                    `);
                                });
                            }
                            
                            commitTransaction();
                        });
                    } else {
                        const insertVeiculo = `
                            INSERT INTO veiculos 
                            (morador_id, placa, marca, modelo, vaga) 
                            VALUES (?, ?, ?, ?, ?)
                        `;
                        
                        db.query(insertVeiculo, [id, placa, marca, modelo, numero_vaga], function(err) {
                            if (err) {
                                return db.rollback(function() {
                                    console.log("Erro ao cadastrar veículo:", err);
                                    
                                    if (err.code === 'ER_DUP_ENTRY') {
                                        res.status(400).send(`
                                            <div class="error-message">
                                                <i class="fas fa-exclamation-circle"></i>
                                                Já existe um veículo cadastrado com esta placa.
                                                <a href="/resident/update/${id}" class="btn-primary">Tentar novamente</a>
                                            </div>
                                        `);
                                    } else {
                                        res.status(500).send(`
                                            <div class="error-message">
                                                <i class="fas fa-exclamation-circle"></i>
                                                Erro ao cadastrar veículo.
                                                <a href="/resident/update/${id}" class="btn-primary">Tentar novamente</a>
                                            </div>
                                        `);
                                    }
                                });
                            }
                            
                            commitTransaction();
                        });
                    }
                });
            } else {
                commitTransaction();
            }
        });
        
        function commitTransaction() {
            db.commit(function(err) {
                if (err) {
                    return db.rollback(function() {
                        console.log("Erro ao fazer commit:", err);
                        res.status(500).send(`
                            <div class="error-message">
                                <i class="fas fa-exclamation-circle"></i>
                                Erro ao finalizar atualização.
                                <a href="/resident/update/${id}" class="btn-primary">Tentar novamente</a>
                            </div>
                        `);
                    });
                }
        
                console.log("Morador atualizado com sucesso!");
                res.send(`
                    <script>
                        alert("Dados salvos com sucesso");
                        window.location.href = "/resident/read";
                    </script>
                `);
            });
        }
    });
});

app.get('/resident/delete-vehicle/:id', function(req, res) {
    const id = req.params.id;
    
    db.query('DELETE FROM veiculos WHERE id = ?', [id], function(err, result) {
        if (err) {
            console.log('Erro ao excluir veículo:', err);
            return res.status(500).send(`
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    Erro ao excluir veículo.
                    <a href="/resident/read" class="btn-primary">Voltar</a>
                </div>
            `);
        }
        
        if (req.query.morador_id) {
            res.redirect(`/resident/update/${req.query.morador_id}`);
        } else {
            res.redirect('/resident/read');
        }
    });
});

app.get('/payment/create', function(req, res) {
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    const referenciaAtual = `${anoAtual}-${mesAtual.toString().padStart(2, '0')}-01`;
    const vencimento = new Date(anoAtual, mesAtual, 10).toISOString().split('T')[0];

    const queryApartamentos = `
        SELECT a.id, a.numero, b.descricao as bloco_descricao 
        FROM apartamentos a
        JOIN blocos b ON a.bloco_id = b.id
        ORDER BY b.descricao, a.numero
    `;
    
    db.query(queryApartamentos, function(err, apartamentos) {
        if (err) return res.status(500).send("Erro ao carregar formulário");

        const renderBaseTemplate = (content) => `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>SysCondomínio - Registrar Pagamento</title>
                <link rel="stylesheet" href="/style.css">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                <style>
                    :root {
                        --primary-color: #2c3e50;
                        --secondary-color: #3498db;
                        --light-color: #ecf0f1;
                        --dark-color: #2c3e50;
                    }
                    
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    }
                    
                    body {
                        background-color: #f5f5f5;
                        color: var(--dark-color);
                    }
                    
                    .app-container {
                        display: grid;
                        grid-template-columns: 250px 1fr;
                        grid-template-rows: 70px 1fr;
                        min-height: 100vh;
                    }
                    
                    .app-header {
                        grid-column: 1 / 3;
                        background-color: white;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 0 2rem;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    }
                    
                    .logo {
                        display: flex;
                        align-items: center;
                        gap: 1rem;
                        color: var(--primary-color);
                    }
                    
                    .logo i {
                        font-size: 1.5rem;
                    }
                    
                    .sidebar {
                        background-color: var(--primary-color);
                        color: white;
                        padding: 1.5rem 0;
                    }
                    
                    .menu {
                        list-style: none;
                    }
                    
                    .menu li a {
                        display: flex;
                        align-items: center;
                        gap: 1rem;
                        padding: 0.8rem 1.5rem;
                        color: var(--light-color);
                        text-decoration: none;
                        transition: all 0.3s;
                    }
                    
                    .menu li a:hover {
                        background-color: rgba(255,255,255,0.1);
                    }
                    
                    .menu li a.active {
                        background-color: var(--secondary-color);
                    }
                    
                    .menu li a i {
                        width: 20px;
                        text-align: center;
                    }
                    
                    .main-content {
                        padding: 2rem;
                    }
                    
                    .page-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                    }

                    .page-header .actions {
                        display: flex;
                        gap: 10px;
                    }

                    
                    .page-header h2 {
                        color: #333;
                        font-size: 24px;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    
                    .form-container {
                        background-color: white;
                        border-radius: 8px;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                        padding: 2rem;
                        max-width: 600px;
                    }
                    
                    .form-group {
                        margin-bottom: 1.5rem;
                    }
                    
                    label {
                        display: block;
                        margin-bottom: 0.5rem;
                        font-weight: 500;
                        color: var(--primary-color);
                    }
                    
                    input, select {
                        width: 100%;
                        padding: 0.75rem;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        font-size: 1rem;
                    }
                    
                    input[readonly] {
                        background-color: #f5f5f5;
                    }
                    
                    .form-actions {
                        margin-top: 2rem;
                    }
                    
                    .btn-primary {
                        background-color: var(--secondary-color);
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 4px;
                        font-size: 1rem;
                        cursor: pointer;
                        transition: background-color 0.3s;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                    }
                    
                    .btn-primary:hover {
                        background-color: #2980b9;
                    }
                    
                    .error-message {
                        color: #f44336;
                        margin-bottom: 1rem;
                        padding: 0.75rem;
                        background-color: #ffebee;
                        border-radius: 4px;
                    }
                    
                    .success-message {
                        color: #4caf50;
                        margin-bottom: 1rem;
                        padding: 0.75rem;
                        background-color: #e8f5e9;
                        border-radius: 4px;
                    }
                    
                    /* Estilos específicos para o select de apartamento */
                    .apartamento-select-container {
                        position: relative;
                        margin-bottom: 1.5rem;
                    }
                    
                    #apartamento_id {
                        width: 100%;
                        padding: 0.75rem 2.5rem 0.75rem 1rem;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        font-size: 1rem;
                        appearance: none;
                        background-color: white;
                        background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232c3e50' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
                        background-repeat: no-repeat;
                        background-position: right 1rem center;
                        background-size: 1em;
                        transition: border-color 0.3s, box-shadow 0.3s;
                        cursor: pointer;
                    }
                    
                    #apartamento_id:focus {
                        border-color: var(--secondary-color);
                        outline: none;
                        box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
                    }
                    
                    .select-icon {
                        position: absolute;
                        right: 1rem;
                        top: 50%;
                        transform: translateY(-50%);
                        pointer-events: none;
                        color: var(--primary-color);
                    }
                    
                    @media (max-width: 768px) {
                        .app-container {
                            grid-template-columns: 1fr;
                        }
                        
                        .sidebar {
                            grid-row: 2;
                        }
                        
                        .main-content {
                            grid-row: 3;
                        }
                    }
                </style>
                <script>
                    function buscarDados() {
                        const apartamentoId = document.getElementById('apartamento_id').value;
                        window.location.href = '/payment/create?apartamento_id=' + apartamentoId;
                    }
                    
                    function validarFormulario() {
                        const apartamento = document.getElementById('apartamento_id').value;
                        const dataPagamento = document.getElementById('data_pagamento').value;
                        const valorPago = document.getElementById('valor_pago').value;
                        
                        if (!apartamento) { alert('Selecione um apartamento válido'); return false; }
                        if (!dataPagamento) { alert('Informe a data do pagamento'); return false; }
                        if (!valorPago || isNaN(valorPago)) { alert('Informe um valor válido'); return false; }
                        
                        return true;
                    }
                </script>
            </head>
            <body>
                <div class="app-container">
                    <header class="app-header">
                        <div class="logo">
                            <i class="fas fa-building"></i>
                            <h1>SysCondomínio</h1>
                        </div>
                        <div class="user-area">
                            <span>Síndico</span>
                            <img src="/images/user-avatar.jpg" alt="Usuário">
                        </div>
                        
                    </header>

                    <nav class="sidebar">
                        <ul class="menu">
                            <li><a href="/block/read"><i class="fas fa-search"></i> Pesquisa de Blocos</a></li>
                                <li><a href="/apartment/read"><i class="fas fa-search"></i> Pesquisa de Apartamentos</a></li>
                                <li><a href="/resident/read"><i class="fas fa-user-friends"></i> Pesquisa de Moradores</a></li>
                                <li><a href="/payment/create"><i class="fas fa-hand-holding-usd"></i> Registro de Pagamento</a></li>
                                <li><a href="/maintenance/create"><i class="fas fa-clipboard-list"></i> Registro de tipos de Manutenção</a></li>
                                <li><a href="/maintenance/register"><i class="fas fa-hammer"></i> Registrar Manutenção</a></li>
                        </ul>
                    </nav>

                    <main class="main-content">
                        ${content}
                    </main>
                </div>
            </body>
            </html>
        `;

        if (req.query.apartamento_id) {
            const apartamentoId = req.query.apartamento_id;
            
            const queryMorador = `
                SELECT m.cpf, m.nome, m.telefone 
                FROM moradores m
                WHERE m.apartamento_id = ? AND m.responsavel = 1
                LIMIT 1
            `;
            
            db.query(queryMorador, [apartamentoId], function(err, moradores) {
                if (err) return res.send(renderBaseTemplate(`
                    <div class="error-message">Erro ao buscar dados do apartamento</div>
                    <a href="/payment/create" class="btn-primary">Voltar</a>
                `));
                
                if (moradores.length === 0) {
                    return res.send(renderBaseTemplate(`
                        <div class="error-message">Apartamento não possui morador responsável</div>
                        <a href="/payment/create" class="btn-primary">Voltar</a>
                    `));
                }
                
                const morador = moradores[0];
                
                const formContent = `
                    <div class="page-header">
                        <h2><i class="fas fa-money-bill-wave"></i> Registrar Pagamento</h2>
                        <a href='/' class="btn-primary">
                                        <i class="fas fa-backward"></i> Voltar
                                    </a>
                    </div>

                    <div class="form-container">
                        ${req.query.error ? `<div class="error-message">${req.query.error}</div>` : ''}
                        ${req.query.success ? `<div class="success-message">${req.query.success}</div>` : ''}
                        
                        <form method="POST" action="/payment/create/submit" onsubmit="return validarFormulario()">
                            <div class="form-group apartamento-select-container">
                                <label for="apartamento_id">Apartamento:</label>
                                <select id="apartamento_id" name="apartamento_id" required onchange="buscarDados()">
                                    <option value="">Selecione um apartamento</option>
                                    ${apartamentos.map(apto => `
                                        <option value="${apto.id}" ${apartamentoId == apto.id ? 'selected' : ''}>
                                         ${apto.bloco_descricao} - Apt ${apto.numero}
                                        </option>
                                    `).join('')}
                                </select>
                                <div class="select-icon">
                                    <i class="fas fa-chevron-down"></i>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="cpf">CPF do Morador:</label>
                                <input type="text" id="cpf" name="cpf" readonly value="${morador.cpf || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label for="morador">Nome do Morador:</label>
                                <input type="text" id="morador" name="morador" readonly value="${morador.nome || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label for="telefone">Telefone:</label>
                                <input type="text" id="telefone" name="telefone" readonly value="${morador.telefone || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label for="referencia">Mês/Ano Referência:</label>
                                <input type="text" id="referencia" name="referencia" readonly value="${referenciaAtual.split('-')[1]}/${referenciaAtual.split('-')[0]}">
                            </div>
                            
                            <div class="form-group">
                                <label for="vencimento">Data de Vencimento:</label>
                                <input type="text" id="vencimento" name="vencimento" readonly value="${vencimento}">
                            </div>
                            
                            <div class="form-group">
                                <label for="data_pagamento">Data do Pagamento:</label>
                                <input type="date" id="data_pagamento" name="data_pagamento" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="valor_pago">Valor Pago (R$):</label>
                                <input type="number" id="valor_pago" name="valor_pago" step="0.01" required>
                            </div>
                            
                            <div class="form-actions">
                                <button type="submit" class="btn-primary">
                                    <i class="fas fa-check"></i> Registrar Pagamento
                                </button>
                            </div>
                        </form>
                    </div>
                `;
                
                res.send(renderBaseTemplate(formContent));
            });
        } else {
            const initialContent = `
                <div class="page-header">
                    <h2><i class="fas fa-money-bill-wave"></i> Registrar Pagamento</h2>
                </div>

                <div class="form-container">
                    ${req.query.error ? `<div class="error-message">${req.query.error}</div>` : ''}
                    
                    <form method="GET" action="/payment/create">
                        <div class="form-group apartamento-select-container">
                            <label for="apartamento_id">Apartamento:</label>
                            <select id="apartamento_id" name="apartamento_id" required>
                                <option value="">Selecione um apartamento</option>
                                ${apartamentos.map(apto => `
                                    <option value="${apto.id}">
                                        Bloco ${apto.bloco_descricao} - Apt ${apto.numero}
                                    </option>
                                `).join('')}
                            </select>
                            <div class="select-icon">
                                <i class="fas fa-chevron-down"></i>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-arrow-right"></i> Continuar
                            </button>
                        </div>
                    </form>
                </div>
            `;
            
            res.send(renderBaseTemplate(initialContent));
        }
    });
});

app.post('/payment/create/submit', function(req, res) {
    const { apartamento_id, referencia, data_pagamento, valor_pago } = req.body;
    
    if (!apartamento_id || !data_pagamento || !valor_pago) {
        return res.redirect('/payment/create?error=Todos os campos são obrigatórios');
    }
    
    const getResponsibleQuery = 'SELECT id FROM moradores WHERE apartamento_id = ? AND responsavel = 1 LIMIT 1';
    db.query(getResponsibleQuery, [apartamento_id], function(err, moradores) {
        if (err) return res.redirect('/payment/create?error=Erro ao registrar pagamento');
        if (moradores.length === 0) return res.redirect('/payment/create?error=Apartamento sem morador responsável');
        
        const morador_id = moradores[0].id;
        const referenciaAtual = new Date().toISOString().slice(0, 7) + '-01';
        const vencimento = new Date();
        vencimento.setMonth(vencimento.getMonth() + 1);
        vencimento.setDate(10);
        const vencimentoFormatado = vencimento.toISOString().split('T')[0];
        
        const insertPaymentQuery = `
            INSERT INTO pagamentos 
            (apartamento_id, morador_id, referencia, valor, vencimento, data_pagamento, valor_pago, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pago')
        `;
        
        db.query(insertPaymentQuery, [
            apartamento_id,
            morador_id,
            referenciaAtual,
            valor_pago,
            vencimentoFormatado,
            data_pagamento,
            valor_pago
        ], function(err, result) {
            if (err) return res.redirect('/payment/create?error=Erro ao registrar pagamento');
            
            res.redirect('/payment/create?success=Pagamento registrado com sucesso');
        });
    });
});

app.get("/maintenance/create", function(req, res){
    res.sendFile(__dirname + "/Pages/Maintenance/Create/index.html");
});

app.post('/maintenance/create/maintenance', function(req, res) {
    const descricao = req.body.descricao;

    const values = [descricao];
    const insert = "INSERT INTO tipos_manutencao (descricao) VALUES (?)";

    db.query(insert, values, function(err, result) {
        if (!err) {
            console.log("Dados inseridos com sucesso!");
            res.redirect('/maintenance/register'); 
        } else {
            console.log("Erro ao inserir dados!", err);
            if (err.errno === 1062) {
                res.status(400).send("Erro: Não pode haver manutenções duplicadas!");
            } else {
                res.status(500).send("Erro interno ao inserir dados!");
            }
        }
    });
});

app.get("/maintenance/register", function(req, res) {
    const query = "SELECT id, descricao FROM tipos_manutencao ORDER BY descricao";
    
    db.query(query, function(err, tipos) {
        if (err) {
            console.log("Erro ao buscar tipos de manutenção:", err);
            return res.status(500).send("Erro ao carregar formulário");
        }
        
        res.send(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>SysCondomínio - Registrar Manutenção</title>
                <link rel="stylesheet" href="/styleMaintenance-register.css">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
            </head>
            <body>
                <header class="app-header">
                    <div class="logo">
                        <i class="fas fa-building"></i>
                        <h1>SysCondomínio</h1>
                    </div>
                    <div class="user-area">
                        <span>Síndico</span>
                        <img src="/images/user-avatar.jpg" alt="Usuário">
                    </div>
                </header>
                
                <div class="sidebar">
                    <ul class="menu">
                                <li><a href="/block/read"><i class="fas fa-search"></i> Pesquisa de Blocos</a></li>
                                <li><a href="/apartment/read"><i class="fas fa-search"></i> Pesquisa de Apartamentos</a></li>
                                <li><a href="/resident/read"><i class="fas fa-user-friends"></i> Pesquisa de Moradores</a></li>
                                <li><a href="/payment/create"><i class="fas fa-hand-holding-usd"></i> Registro de Pagamento</a></li>
                                <li><a href="/maintenance/create"><i class="fas fa-clipboard-list"></i> Registro de tipos de Manutenção</a></li>
                                <li><a href="/maintenance/register"><i class="fas fa-hammer"></i> Registrar Manutenção</a></li>
                    </ul>
                </div>
                
                <main class="main-content">
                    <div class="container">
                        <h1><i class="fas fa-tools"></i> Registrar Manutenção</h1>
                        
                        <form action="/maintenance/register" method="POST" onsubmit="return validateForm()">
                            <div class="form-group">
                                <label for="tipo_manutencao">Tipo de Manutenção:</label>
                                <select id="tipo_manutencao" name="tipo_manutencao" required>
                                    <option value="">Selecione</option>
                                    ${tipos.map(tipo => `
                                        <option value="${tipo.id}">${tipo.descricao}</option>
                                    `).join('')}
                                </select>
                                <div id="tipoError" class="error-message"></div>
                            </div>
                            
                            <div class="form-group">
                                <label for="data_manutencao">Data:</label>
                                <input type="date" id="data_manutencao" name="data_manutencao" required>
                                <div id="dataError" class="error-message"></div>
                            </div>
                            
                            <div class="form-group">
                                <label for="local_manutencao">Local:</label>
                                <input type="text" id="local_manutencao" name="local_manutencao" required>
                                <div id="localError" class="error-message"></div>
                            </div>
                            
                            <div class="form-group">
                                <label for="descricao">Descrição (Opcional):</label>
                                <textarea id="descricao" name="descricao" rows="3"></textarea>
                            </div>
                            
                            <div class="btn-group">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i> Registrar
                                </button>
                                <a href="/" class="btn btn-secondary">
                                    <i class="fas fa-arrow-left"></i> Voltar
                                </a>
                            </div>
                        </form>
                    </div>
                </main>
                
                <script>
                    function validateForm() {
                        const tipo = document.getElementById('tipo_manutencao').value;
                        const data = document.getElementById('data_manutencao').value;
                        const local = document.getElementById('local_manutencao').value;
                        
                        let isValid = true;
                        
                        if (!tipo) {
                            document.getElementById('tipoError').textContent = 'Selecione o tipo de manutenção';
                            isValid = false;
                        } else {
                            document.getElementById('tipoError').textContent = '';
                        }
                        
                        if (!data) {
                            document.getElementById('dataError').textContent = 'Informe a data da manutenção';
                            isValid = false;
                        } else {
                            document.getElementById('dataError').textContent = '';
                        }
                        
                        if (!local) {
                            document.getElementById('localError').textContent = 'Informe o local da manutenção';
                            isValid = false;
                        } else {
                            document.getElementById('localError').textContent = '';
                        }
                        
                        return isValid;
                    }
                </script>
            </body>
            </html>
        `);
    });
});

app.post("/maintenance/register", function(req, res) {
    const { tipo_manutencao, data_manutencao, local_manutencao, descricao } = req.body;
    
    if (!tipo_manutencao || !data_manutencao || !local_manutencao) {
        return res.status(400).send(`
            <script>
                alert("Preencha todos os campos obrigatórios");
                window.history.back();
            </script>
        `);
    }
    
    const query = "INSERT INTO manutencoes (tipo_id, data_manutencao, local, descricao) VALUES (?, ?, ?, ?)";
    const values = [tipo_manutencao, data_manutencao, local_manutencao, descricao || null];
    
    db.query(query, values, function(err, result) {
        if (err) {
            console.log("Erro ao registrar manutenção:", err);
            return res.status(500).send(`
                <script>
                    alert("Erro ao registrar manutenção");
                    window.history.back();
                </script>
            `);
        }
        
        res.send(`
            <script>
                alert("Manutenção registrada com sucesso");
                window.location.href = "/maintenance/register";
            </script>
        `);
    });
});
module.exports = app;
