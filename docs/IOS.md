# Imperium Training no iPhone

Guia verificado em **6 de novembro de 2026**, para **Expo SDK 58**. O projeto utiliza componentes nativos React Native e pode gerar um aplicativo iOS. O repositório entrega código e configuração: **nenhum `.ipa` assinado foi gerado, instalado ou publicado nesta etapa**.

## Desenvolvimento no Windows

Instale uma versão LTS de Node.js compatível com o SDK 58 e abra o terminal na pasta do projeto:

```sh
npm ci
npm run web
```

A prévia no navegador permite testar telas e fluxos. Para executar o app nativo no iPhone a partir do Windows, use a compilação em nuvem do Expo Build, através do EAS CLI. Ela não exige Xcode no computador Windows. [Documentação oficial de development builds](https://docs.expo.dev/develop/development-builds/introduction/?buildenv=build-with-expo-services)

## Caminho recomendado: build de desenvolvimento

Você precisará de uma conta Expo, acesso a uma assinatura ativa do Apple Developer Program e do iPhone que será registrado para instalação. Este projeto já inclui `expo-dev-client`; o perfil `development` em `eas.json` usa distribuição interna. [Preparação oficial para iPhone](https://docs.expo.dev/get-started/set-up-your-environment/?device=physical&mode=development-build&platform=ios)

1. Entre na sua conta Expo e associe o projeto à conta correta:

   ```sh
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```

   O segundo comando cria ou vincula o projeto remoto. Confira o proprietário e o identificador iOS antes da primeira compilação; a identidade de distribuição precisa pertencer ao seu projeto. [Referência do EAS CLI](https://docs.expo.dev/eas/cli/)

2. Registre o iPhone seguindo o endereço fornecido pelo comando:

   ```sh
   npx eas-cli@latest device:create
   ```

   A instalação interna iOS permite somente os aparelhos incluídos no perfil de assinatura. Um iPhone acrescentado depois pode exigir nova assinatura ou compilação. [Distribuição interna](https://docs.expo.dev/build/internal-distribution/)

3. Quando você decidir gerar o aplicativo, execute:

   ```sh
   npx eas-cli@latest build --platform ios --profile development
   ```

   Siga a autenticação Apple e a configuração dos certificados. O serviço enviará o código para compilar e assinar na nuvem. O processo pode consumir a cota do plano Expo. Este guia apenas prepara esse passo; não o executa nem publica o aplicativo. [Primeira compilação](https://docs.expo.dev/build/setup/)

4. Instale pelo link ou QR code do build concluído. Se solicitado, habilite o Modo de Desenvolvedor em **Ajustes → Privacidade e Segurança** no iPhone e siga a reinicialização indicada pelo sistema. [Modo de Desenvolvedor no iOS](https://docs.expo.dev/guides/ios-developer-mode/)

5. Com o computador e o iPhone na mesma rede, inicie o servidor:

   ```sh
   npm start
   ```

   Abra o app de desenvolvimento instalado e conecte-o ao servidor mostrado no terminal. Como `expo-dev-client` está instalado, o Expo CLI usa esse destino por padrão. Se a rede impedir a conexão, consulte o modo túnel em vez de desativar a proteção do computador. [Expo CLI](https://docs.expo.dev/more/expo-cli/)

## Alternativa: Expo Go no iOS

A documentação oficial consultada mudou em relação a tutoriais antigos: para iPhone físico, ela orienta criar um build do Expo Go com uma conta Apple Developer e instalá-lo pelo TestFlight:

```sh
npx eas-cli@latest go
```

Depois, instale o TestFlight, abra o projeto Expo Go no App Store Connect, adicione seu Apple ID como testador interno e aceite o convite. Entre na **mesma conta Expo** no computador e no Expo Go:

```sh
npx expo login
npx expo start --go
```

Esse caminho também exige configuração e assinatura; não pressupõe um Expo Go compatível já instalado. Para o desenvolvimento continuado deste aplicativo, prefira o build próprio descrito acima. [Fluxo oficial Expo Go para iPhone](https://docs.expo.dev/get-started/set-up-your-environment/?device=physical&mode=expo-go&platform=ios)

## Distribuição e validação

### App independente no iPhone

Depois do login, vínculo do projeto e registro do aparelho descritos acima, gere o perfil `preview` para usar o aplicativo sem manter o computador ou o servidor de desenvolvimento ligados:

```sh
npx eas-cli@latest build --platform ios --profile preview
```

Esse perfil usa distribuição interna e inclui o código do aplicativo no binário. Instale pelo link do build em um iPhone incluído no perfil de assinatura. Ele funciona localmente para registrar treinos e abrir o arsenal, sem depender do servidor de desenvolvimento. A assinatura Apple continua sendo necessária. [Distribuição interna](https://docs.expo.dev/build/internal-distribution/)

### TestFlight e App Store

Um build de desenvolvimento precisa do servidor local durante o desenvolvimento. Um build de distribuição é uma etapa separada, assim como o envio ao TestFlight ou à App Store. O envio de um binário ao App Store Connect não publica automaticamente a versão na loja. Nenhum envio é realizado por este guia. [Publicação com Expo](https://docs.expo.dev/deploy/submit-to-app-stores/)

Antes de distribuir, teste no iPhone a conclusão de treinos, persistência após reiniciar, teclado numérico, áreas seguras, navegação e bloqueios de equipamento nas duas campanhas. Revise também as permissões de uso de propriedade intelectual de Warhammer e dos materiais de terceiros. Não trate ilustrações simplificadas, XP ou gates do aplicativo como conteúdo oficial da Games Workshop.

O MVP guarda histórico, perfil e rotinas localmente. Não há backend, sincronização entre aparelhos, recursos sociais, HealthKit, cálculo de calorias ou avatar 3D. Limpar os dados do aplicativo pode remover os registros locais.
