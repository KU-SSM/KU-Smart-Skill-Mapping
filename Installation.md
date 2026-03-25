# Installation steps

## 1. Clone repository.

- Clone this repository to your local computer.

```
git clone https://github.com/KU-SSM/KU-Smart-Skill-Mapping
```
**NOTED**: ```DirectoryName``` is your desired directory name.

## 2. Create virtual environment and install dependencies.

- Create virtual environment.

```
python -m venv env
```

- Change to your newly created virtual environment.

For Mac and Linux.
```
source env/bin/activate
```
For Window.
```
env\Scripts\activate.bat
```

- Install packages from requirements.txt

```
pip install -r requirements.txt
```

## 3. Database Setup.

Database Setup : follow the step in [Database Setup](DATABASE_SETUP.md)

## 4. Set values for externalized variables.

- Copy code from [sample.env](sample.env) and paste it in `.env`