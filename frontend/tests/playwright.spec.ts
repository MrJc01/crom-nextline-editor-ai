import { test, expect } from '@playwright/test'

test.describe('Crom Nextline Editor AI - Painel do Cliente', () => {
  
  test('Fluxo completo: Login -> Dashboard -> Listagem dos 3 Workspaces -> Editor', async ({ page }) => {
    // 1. Navegar para a página de login
    await page.goto('/login')

    // 2. Preencher formulário de login do cliente
    await page.locator('input[type="email"]').fill('client@crom.run')
    await page.locator('input[type="password"]').fill('password')
    
    // 3. Submeter formulário de login
    await page.locator('button[type="submit"]').click()

    // 4. Aguardar redirecionamento para o dashboard de workspaces
    await expect(page.locator('h2')).toContainText('Seus Projetos Web', { timeout: 10000 })

    // 5. Verificar a presença dos 3 workspaces criados
    const pageContent = page.locator('body')
    await expect(pageContent).toContainText('Landing Page de Academia')
    await expect(pageContent).toContainText('E-Commerce de Calçados')
    await expect(pageContent).toContainText('Portal de Eventos Tech')

    // 6. Clicar no link de edição do primeiro workspace
    const editButton = page.locator('a[href*="/workspace/22222222-2222-2222-2222-222222222222"]')
    await expect(editButton).toBeVisible()
    await editButton.click()

    // 7. Validar que estamos no editor focado do workspace
    await expect(page).toHaveURL(/\/workspace\/22222222-2222-2222-2222-222222222222/)
    await expect(page.locator('header h3')).toContainText('Landing Page de Academia')

    // 8. Verificar que a aba do chat de comando está visível
    const chatInput = page.locator('input[placeholder*="Pedir alteração"]')
    await expect(chatInput).toBeVisible()

    // 9. Simular envio de mensagem no chat
    await chatInput.fill('Adicione uma tabela de preços')
    await page.locator('form button[type="submit"]').click()

    // 10. Navegar para a página "Sobre" usando o menu lateral
    const aboutLink = page.locator('aside a[title="Sobre a Plataforma"]')
    await expect(aboutLink).toBeVisible()
    await aboutLink.click()
    
    await expect(page).toHaveURL(/\/sobre/)
    await expect(page.locator('h2')).toContainText('Sobre o Crom Nextline')
  })
})
