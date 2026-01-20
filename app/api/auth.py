from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import User

router = APIRouter(prefix="/api/auth", tags=["User Management"])


# Pydantic Schemas
class UserCreate(BaseModel):
    """Schema for user creation."""
    username: str = Field(..., min_length=3, max_length=50)
    full_name: Optional[str] = Field(None, max_length=100)


class UserResponse(BaseModel):
    """Schema for user response."""
    id: int
    username: str
    full_name: Optional[str]

    class Config:
        from_attributes = True


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user.
    
    - **username**: Unique username (3-50 characters)
    - **full_name**: Optional full name
    """
    # Check if username exists
    existing_user = db.execute(
        select(User).where(User.username == user_data.username)
    ).scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Create user
    user = User(
        username=user_data.username,
        full_name=user_data.full_name
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user


@router.get("/users/{username}", response_model=UserResponse)
def get_user(username: str, db: Session = Depends(get_db)):
    """
    Get user by username.
    """
    user = db.execute(
        select(User).where(User.username == username)
    ).scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.get("/users", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db)):
    """
    List all users.
    """
    result = db.execute(select(User))
    users = result.scalars().all()
    return users
