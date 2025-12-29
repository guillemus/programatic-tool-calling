import type { User, Session } from 'better-auth'

declare namespace App {
    interface Locals {
        user?: User
        session?: Session
    }
}
