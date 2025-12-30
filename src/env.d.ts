import type { Session, User } from 'better-auth'

declare namespace App {
    interface Locals {
        user?: User
        session?: Session
    }
}
