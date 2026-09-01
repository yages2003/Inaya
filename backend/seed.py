"""
Inaya — Seed script. Run: python seed.py
Creates demo users (all roles), 3 projects in different states, tasks, comments.
Demo password for every user: password123
"""

from datetime import date, timedelta

from database import SessionLocal
import models
import crud
import schemas
from auth import hash_password
from permissions import Role


def clear_all(db):
    db.query(models.Activity).delete()
    db.query(models.Comment).delete()
    db.query(models.TaskAssignee).delete()
    db.query(models.RiskSignal).delete()
    db.query(models.ProjectAISummary).delete()
    db.query(models.Task).delete()
    db.query(models.Project).delete()
    db.query(models.Assignee).delete()
    db.query(models.User).delete()
    db.commit()


def run():
    db = SessionLocal()
    try:
        print("Clearing existing data...")
        clear_all(db)

        print("Creating assignees...")
        people = [
            ("Aarav Sharma", "aarav@psiog.com", "Backend Engineer"),
            ("Diya Nair", "diya@psiog.com", "Frontend Engineer"),
            ("Kabir Rao", "kabir@psiog.com", "QA Engineer"),
            ("Meera Iyer", "meera@psiog.com", "Project Manager"),
            ("Rohan Das", "rohan@psiog.com", "Designer"),
        ]
        amap = {}
        for name, email, role in people:
            a = crud.create_assignee(db, schemas.AssigneeCreate(name=name, email=email, role=role))
            amap[email] = a.id

        print("Creating users (login accounts)...")
        demo_users = [
            ("Super Admin", "admin@inaya.com", Role.super_admin),
            ("Meera Iyer", "meera@psiog.com", Role.project_manager),
            ("Sam Scrum", "scrum@psiog.com", Role.scrum_master),
            ("Aarav Sharma", "aarav@psiog.com", Role.developer),
            ("Kabir Rao", "kabir@psiog.com", Role.qa_engineer),
            ("Diya Nair", "diya@psiog.com", Role.developer),
            ("Rhea Report", "reporter@psiog.com", Role.reporter),
            ("Vik Viewer", "viewer@psiog.com", Role.viewer),
        ]
        for name, email, role in demo_users:
            db.add(models.User(name=name, email=email,
                               hashed_password=hash_password("password123"), role=role))
        db.commit()

        today = date.today()
        print("Creating projects + tasks...")

        # Project 1 — on track
        p1 = crud.create_project(db, schemas.ProjectCreate(
            name="Customer Portal Revamp", key="CPR",
            description="Redesign and rebuild the client-facing customer portal.",
            status=models.ProjectStatus.on_track,
            start_date=today - timedelta(days=20), end_date=today + timedelta(days=40)))
        crud.create_task(db, schemas.TaskCreate(
            title="Design new dashboard layout", project_id=p1.id,
            category=models.TaskCategory.design, priority=models.TaskPriority.high,
            status=models.TaskStatus.done, estimated_hours=16,
            start_date=today - timedelta(days=18), due_date=today - timedelta(days=10),
            assignee_ids=[amap["diya@psiog.com"], amap["rohan@psiog.com"]]))
        crud.create_task(db, schemas.TaskCreate(
            title="Build authentication API", project_id=p1.id,
            category=models.TaskCategory.development, priority=models.TaskPriority.critical,
            status=models.TaskStatus.in_progress, estimated_hours=24,
            start_date=today - timedelta(days=8), due_date=today + timedelta(days=5),
            assignee_ids=[amap["aarav@psiog.com"]]))
        crud.create_task(db, schemas.TaskCreate(
            title="Write E2E tests for login flow", project_id=p1.id,
            category=models.TaskCategory.testing, priority=models.TaskPriority.medium,
            status=models.TaskStatus.todo, estimated_hours=12,
            start_date=today, due_date=today + timedelta(days=15),
            assignee_ids=[amap["kabir@psiog.com"]]))
        crud.create_task(db, schemas.TaskCreate(
            title="Document API endpoints", project_id=p1.id,
            category=models.TaskCategory.documentation, priority=models.TaskPriority.low,
            status=models.TaskStatus.todo, estimated_hours=6,
            start_date=today + timedelta(days=2), due_date=today + timedelta(days=20),
            assignee_ids=[amap["meera@psiog.com"]]))

        # Project 2 — at risk
        p2 = crud.create_project(db, schemas.ProjectCreate(
            name="Data Migration Platform", key="DMP",
            description="Migrate legacy records into the new warehouse.",
            status=models.ProjectStatus.at_risk,
            start_date=today - timedelta(days=35), end_date=today + timedelta(days=10)))
        crud.create_task(db, schemas.TaskCreate(
            title="Map legacy schema to new model", project_id=p2.id,
            category=models.TaskCategory.research, priority=models.TaskPriority.high,
            status=models.TaskStatus.done, estimated_hours=20,
            start_date=today - timedelta(days=34), due_date=today - timedelta(days=20),
            assignee_ids=[amap["aarav@psiog.com"], amap["meera@psiog.com"]]))
        crud.create_task(db, schemas.TaskCreate(
            title="Build ETL pipeline", project_id=p2.id,
            category=models.TaskCategory.development, priority=models.TaskPriority.critical,
            status=models.TaskStatus.blocked, estimated_hours=40,
            start_date=today - timedelta(days=15), due_date=today - timedelta(days=2),
            assignee_ids=[amap["aarav@psiog.com"]]))
        crud.create_task(db, schemas.TaskCreate(
            title="Validate migrated records", project_id=p2.id,
            category=models.TaskCategory.testing, priority=models.TaskPriority.high,
            status=models.TaskStatus.todo, estimated_hours=16,
            start_date=today, due_date=today + timedelta(days=8),
            assignee_ids=[amap["kabir@psiog.com"]]))

        # Project 3 — delayed
        p3 = crud.create_project(db, schemas.ProjectCreate(
            name="Mobile App Launch", key="MAL",
            description="Ship the v1 mobile application to app stores.",
            status=models.ProjectStatus.delayed,
            start_date=today - timedelta(days=60), end_date=today - timedelta(days=5)))
        crud.create_task(db, schemas.TaskCreate(
            title="Finalize app store assets", project_id=p3.id,
            category=models.TaskCategory.documentation, priority=models.TaskPriority.medium,
            status=models.TaskStatus.review, estimated_hours=8,
            start_date=today - timedelta(days=15), due_date=today - timedelta(days=8),
            assignee_ids=[amap["diya@psiog.com"]]))
        t_crash = crud.create_task(db, schemas.TaskCreate(
            title="Fix critical crash on startup", project_id=p3.id,
            category=models.TaskCategory.development, priority=models.TaskPriority.critical,
            status=models.TaskStatus.in_progress, estimated_hours=16,
            start_date=today - timedelta(days=10), due_date=today - timedelta(days=3),
            assignee_ids=[amap["aarav@psiog.com"], amap["kabir@psiog.com"]]))

        crud.create_comment(db, t_crash.id, schemas.CommentCreate(
            content="Reproduced on Android 13 — null pointer in the init sequence.",
            author_id=amap["kabir@psiog.com"]))
        crud.create_comment(db, t_crash.id, schemas.CommentCreate(
            content="On it. Will push a fix by EOD.", author_id=amap["aarav@psiog.com"]))

        print("\nSeed complete!")
        for label, model in [("Projects", models.Project), ("Tasks", models.Task),
                             ("Assignees", models.Assignee), ("Comments", models.Comment),
                             ("Activity", models.Activity), ("Users", models.User)]:
            print(f"  {label}: {db.query(model).count()}")
    finally:
        db.close()


if __name__ == "__main__":
    run()