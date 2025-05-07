
# Library Management System - Backend

Tento backend slouží jako API pro LibraryApp, které zahrnuje registraci, přihlášení uživatelů, autentizaci pomocí JWT tokenu a propojení s PostgreSQL databází.

## Technologie

- **Node.js**: JavaScript runtime, který používáme pro spuštění serveru.
- **Express**: Framework pro Node.js pro snadnou tvorbu serveru a routování.
- **PostgreSQL**: Relational database pro uložení uživatelských a knihovních dat.
- **JWT (JSON Web Tokens)**: Pro autentizaci a autorizaci uživatelů.
- **bcrypt**: Knihovna pro šifrování hesel.
- **dotenv**: Knihovna pro načítání proměnných prostředí ze souboru `.env`.
- **cors**: Middleware pro povolení CORS (Cross-Origin Resource Sharing).

## Funkce

1. **Registrace uživatele**:
   - Uživatelé se mohou zaregistrovat s informacemi jako je jméno, příjmení, email a heslo.
   - Heslo je zašifrováno pomocí knihovny bcrypt.

2. **Přihlášení uživatele**:
   - Uživatelé se mohou přihlásit zadáním svého emailu a hesla.
   - Pokud jsou přihlašovací údaje správné, backend vrátí JWT token, který slouží pro následnou autentizaci.

3. **Autentizace pomocí JWT tokenu**:
   - Po přihlášení obdrží uživatel JWT token.
   - Tento token je třeba posílat v hlavičce HTTP požadavků pro autentizaci uživatele při přístupu na chráněné endpointy.

## Instalace

### 1. Klonování repozitáře

```bash
git clone https://github.com/tvuj-username/library-management-system-backend.git
cd library-management-system-backend
```

### 2. Instalace závislostí

Po klonování repozitáře spusťte následující příkaz pro instalaci všech potřebných závislostí:

```bash
npm install
```

### 3. Konfigurace prostředí

Vytvořte soubor `.env` v kořenovém adresáři projektu a přidejte následující proměnné:

```
JWT_SECRET=tvuj_tajny_klic
DB_USER=tvuj_postgres_uzivatel
DB_HOST=localhost
DB_DATABASE=library_management_system
DB_PASSWORD=tvuj_postgres_heslo
DB_PORT=5432
PORT=3000
```

Nastavte hodnoty podle vašich potřeb, například pro připojení k PostgreSQL databázi a tajný klíč pro JWT.

### 4. Spuštění aplikace

Pro spuštění backendu použijte následující příkaz:

```bash
npm start
```

Server bude spuštěn na `http://localhost:3000`.

## API Endpoints

### Registrace uživatele
- **Metoda**: `POST`
- **URL**: `/api/auth/register`
- **Tělo požadavku**:
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "email": "johndoe@example.com",
    "password": "Heslo123"
  }
  ```
- **Úspěšná odpověď**:
  ```json
  {
    "accessToken": "JWT_token"
  }
  ```
- **Chyba**: Pokud uživatel s daným emailem již existuje, vrátí se status 400 s chybovou zprávou.

### Přihlášení uživatele
- **Metoda**: `POST`
- **URL**: `/api/auth/login`
- **Tělo požadavku**:
  ```json
  {
    "email": "johndoe@example.com",
    "password": "Heslo123"
  }
  ```
- **Úspěšná odpověď**:
  ```json
  {
    "accessToken": "JWT_token"
  }
  ```
- **Chyba**: Pokud přihlašovací údaje nejsou správné, vrátí se status 401 s chybovou zprávou.

### Seznam uživatelů (chráněné endpoint)
- **Metoda**: `GET`
- **URL**: `/api/users`
- **Hlava požadavku**:
  ```
  Authorization: Bearer <JWT_token>
  ```
- **Úspěšná odpověď**:
  ```json
  [
    {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "johndoe@example.com"
    },
    ...
  ]
  ```
- **Chyba**: Pokud není platný JWT token, vrátí se status 401.

## Struktura projektu

```
/library-management-system-backend
|-- /node_modules              # Nainstalované závislosti
|-- /routes                    # Soubory pro definování rout
|   |-- authRoutes.js          # Routy pro autentizaci a registraci
|-- /db                        # Kód pro připojení k databázi
|   |-- db.js                  # Soubor pro připojení k PostgreSQL
|-- /controllers               # Logika pro zpracování požadavků
|-- .env                       # Proměnné prostředí
|-- package.json               # Základní informace o projektu
|-- server.js                  # Hlavní soubor pro spuštění serveru
```

## Bezpečnostní upozornění

1. **Nikdy nesdílejte svůj JWT_SECRET**. Tento klíč by měl být držet v tajnosti.
2. **Tokeny by měly mít omezenou životnost** (v tuto chvíli je nastaveno 1 hodina), aby se minimalizovalo riziko zneužití, pokud by byl token ukraden.

## Vývoj a testování

Pro testování API můžete použít nástroje jako [Postman](https://www.postman.com/) nebo [Insomnia](https://insomnia.rest/).

Pokud budete chtít přidat testy, doporučujeme použít knihovnu [Jest](https://jestjs.io/) pro testování backendu.
