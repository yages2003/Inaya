"""
Inaya — Seed script. Inserts sample data for immediate testing / demo.
Run:  python seed.py

Safe to re-run: it clears existing rows first (dev only — do NOT run on real data).
"""

from datetime import date, timedelta

from database import SessionLocal, engine
import models
import crud
import schemas


def clear_all(db):
    # order matters due to FKs; cascades handle children, but be explicit for clarity
    db.query(models.Activity).delete()
    db.query(models.Comment).delete()
    db.query(models.TaskAssignee).delete()
    db.query(models.RiskSignal).delete()
    db.query(models.ProjectAISummary).delete()
    db.query(models.Task).delete()
    db.query(models.Project).delete()
    db.query(models.Assignee).delete()
    db.commit()


def run():
    db = SessionLocal()
    try:
        print("Clearing existing data...")
        clear_all(db)

        print("Creating assignees...")
        people = [
            schemas.AssigneeCreate(name="Aarav Sharma", email="aarav@psiog.com", role="Backend Engineer"),
            schemas.AssigneeCreate(name="Diya Nair", email="diya@psiog.com", role="Frontend Engineer"),
            schemas.AssigneeCreate(name="Kabir Rao", email="kabir@psiog.com", role="QA Engineer"),
            schemas.AssigneeCreate(name="Meera Iyer", email="meera@psiog.com", role="Project Manager"),
        ]
        assignees = [crud.create_assignee(db, p) for p in people]
        aarav, diya, kabir, meera = [a.id for a in assignees]

        today = date.today()

        print("Creating projects + tasks...")

        # ---- Project 1: on track ----
        p1 = crud.create_project(db, schemas.ProjectCreate(
            name="Customer Portal Revamp",
            description="Redesign and rebuild the client-facing customer portal.",
            status=models.ProjectStatus.on_track,
            start_date=today - timedelta(days=20),
            end_date=today + timedelta(days=40),
        ))
        crud.create_task(db, schemas.TaskCreate(
            title="Design new dashboard layout", project_id=p1.id,
            category=models.TaskCategory.design, priority=models.TaskPriority.high,
            status=models.TaskStatus.done, estimated_hours=16,
            start_date=today - timedelta(days=18), due_date=today - timedelta(days=10),
            assignee_ids=[diya],
        ))
        crud.create_task(db, schemas.TaskCreate(
            title="Build authentication API", project_id=p1.id,
            category=models.TaskCategory.development, priority=models.TaskPriority.critical,
            status=models.TaskStatus.in_progress, estimated_hours=24,
            start_date=today - timedelta(days=8), due_date=today + timedelta(days=5),
            assignee_ids=[aarav],
        ))
        crud.create_task(db, schemas.TaskCreate(
            title="Write E2E tests for login flow", project_id=p1.id,
            category=models.TaskCategory.testing, priority=models.TaskPriority.medium,
            status=models.TaskStatus.todo, estimated_hours=12,
            due_date=today + timedelta(days=15), assignee_ids=[kabir],
        ))

        # ---- Project 2: at risk ----
        p2 = crud.create_project(db, schemas.ProjectCreate(
            name="Data Migration Platform",
            description="Migrate legacy records into the new warehouse.",
            status=models.ProjectStatus.at_risk,
            start_date=today - timedelta(days=35),
            end_date=today + timedelta(days=10),
        ))
        crud.create_task(db, schemas.TaskCreate(
            title="Map legacy schema to new model", project_id=p2.id,
            category=models.TaskCategory.research, priority=models.TaskPriority.high,
            status=models.TaskStatus.done, estimated_hours=20,
            start_date=today - timedelta(days=34), due_date=today - timedelta(days=20),
            assignee_ids=[aarav, meera],
        ))
        crud.create_task(db, schemas.TaskCreate(
            title="Build ETL pipeline", project_id=p2.id,
            category=models.TaskCategory.development, priority=models.TaskPriority.critical,
            status=models.TaskStatus.blocked, estimated_hours=40,
            start_date=today - timedelta(days=15), due_date=today - timedelta(days=2),
            assignee_ids=[aarav],
        ))

        # ---- Project 3: delayed ----
        p3 = crud.create_project(db, schemas.ProjectCreate(
            name="Mobile App Launch",
            description="Ship the v1 mobile application to app stores.",
            status=models.ProjectStatus.delayed,
            start_date=today - timedelta(days=60),
            end_date=today - timedelta(days=5),
        ))
        crud.create_task(db, schemas.TaskCreate(
            title="Finalize app store assets", project_id=p3.id,
            category=models.TaskCategory.documentation, priority=models.TaskPriority.medium,
            status=models.TaskStatus.review, estimated_hours=8,
            due_date=today - timedelta(days=8), assignee_ids=[diya],
        ))
        t_last = crud.create_task(db, schemas.TaskCreate(
            title="Fix critical crash on startup", project_id=p3.id,
            category=models.TaskCategory.development, priority=models.TaskPriority.critical,
            status=models.TaskStatus.in_progress, estimated_hours=16,
            due_date=today - timedelta(days=3), assignee_ids=[aarav, kabir],
        ))

        # a couple of comments to seed the collaboration feed
        crud.create_comment(db, t_last.id, schemas.CommentCreate(
            content="Reproduced on Android 13 — looks like a null pointer in the init sequence.",
            author_id=kabir,
        ))
        crud.create_comment(db, t_last.id, schemas.CommentCreate(
            content="On it. Will push a fix by EOD.", author_id=aarav,
        ))

        print("\nSeed complete!")
        print(f"  Projects: {db.query(models.Project).count()}")
        print(f"  Tasks:    {db.query(models.Task).count()}")
        print(f"  Assignees:{db.query(models.Assignee).count()}")
        print(f"  Comments: {db.query(models.Comment).count()}")
        print(f"  Activity: {db.query(models.Activity).count()}")

    finally:
        db.close()


if __name__ == "__main__":
    run()