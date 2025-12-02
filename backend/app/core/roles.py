from enum import Enum


class Role(str, Enum):
    """User roles enum - easily extensible by adding new role values"""
    ADMIN = "admin"
    USER = "user"
    
    def __str__(self):
        return self.value


def get_role_value(role: str) -> Role:
    """Convert string role to Role enum"""
    try:
        return Role(role.lower())
    except ValueError:
        return Role.USER


def has_role(user_role: str, required_roles: list[Role]) -> bool:
    """Check if user role is in the list of required roles"""
    user_role_enum = get_role_value(user_role)
    return user_role_enum in required_roles

