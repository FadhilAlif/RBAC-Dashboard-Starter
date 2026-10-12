import chalk from "chalk";

export function printNextSteps(projectName: string): void {
  console.log(`
${chalk.green("  ✔ Done!")} Your RBAC project is ready.

  ${chalk.bold("Next steps:")}

  ${chalk.cyan(`cd ${projectName}`)}

  ${chalk.gray("1. Configure environment")}
  ${chalk.cyan("cp backend/.env.example backend/.env")}          ${chalk.gray("# fill in PostgreSQL / NeonDB credentials + JWT secrets")}
  ${chalk.cyan("cp frontend/.env.example frontend/.env.local")}

  ${chalk.gray("2. Install dependencies")}
  ${chalk.cyan("npm install")}

  ${chalk.gray("3. Run database migrations & seed initial RBAC data")}
  ${chalk.cyan("npm run migrate")}
  ${chalk.cyan("npm run seed")}
  ${chalk.cyan("npm run create-admin")}

  ${chalk.gray("4. Start the development servers")}
  ${chalk.cyan("npm run dev:backend")}                            ${chalk.gray("# NestJS API: http://localhost:3001")}
  ${chalk.cyan("npm run dev:frontend")}                           ${chalk.gray("# Next.js UI: http://localhost:3000")}

  ${chalk.gray("Then log in at")} ${chalk.underline("http://localhost:3000/login")}
  ${chalk.gray("API docs (Swagger):")} ${chalk.underline("http://localhost:3001/api/docs")}
  ${chalk.gray("Drizzle Studio:")}      ${chalk.underline("npm run db:studio")}
  ${chalk.gray("Full setup guide:")}   docs/SETUP.md
`);
}
