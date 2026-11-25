# Imperium Training

Aplicativo de treino para iPhone em React Native, TypeScript e **Expo SDK 58**, com navegação Expo Router. Interface inspirada nas referências do Liftoff e campanhas de fã de Warhammer 40,000.

O app reúne seis abas: **Comando, Treino, Objetivos, Cruzada, Arsenal e Perfil**. Você escolhe os exercícios e grupos musculares de cada treino ou reutiliza uma rotina pessoal. O Comando mostra a frequência semanal, o mapa dos músculos trabalhados, os relatos de recuperação e o diário de refeições e água. A Cruzada acompanha esses hábitos. O perfil feminino segue a campanha Adepta Sororitas, com equipamento próprio.

Em **Objetivos**, acompanhe a melhor carga registrada para um exercício, a evolução do peso corporal e quantos dias treinou na semana. Séries concluídas atualizam força e consistência. As pesagens são informadas pela pessoa.

O cogitador gótico emoldura retratos em **quadrinho sombrio**, com sombras de tinta e luz de papel sobre a pele e a armadura. Em **Perfil → Personalizar avatar** ou **Arsenal → Editar aparência**, é possível escolher tom e textura de pele, tipo de corpo, formato da cabeça, dos olhos e dos lábios, corte e cor do cabelo, cor dos pelos faciais, bigode e barba. Cada campanha usa seu próprio arsenal. [Direção visual](docs/DESIGN.md).

## Executar

Na pasta do projeto, com Node.js LTS compatível com o SDK 58:

```sh
npm ci
npm start
```

Para abrir a versão de desenvolvimento no navegador:

```sh
npm run web
```

Para verificar o projeto:

```sh
npm test
npm run typecheck
npm run lint
npx playwright install chromium
npm run test:ui
```

**Instalação no iPhone:** siga [o guia de iOS](docs/IOS.md). O código nativo está preparado para compilação e assinatura; não acompanha um `.ipa` assinado. A visualização web serve para desenvolvimento e não substitui testes no aparelho.

O perfil `preview` gera um aplicativo independente do computador; `development` é para desenvolvimento com servidor local. Ambos precisam de conta e assinatura configuradas, conforme o guia.

## Escopo

Treinos, metas, pesagens, refeições e relatos de recuperação ficam no dispositivo. O diário soma os valores de energia e proteína que a pessoa informa.

Consulte [a referência de lore](docs/LORE.md) antes de acrescentar patentes, armaduras ou relíquias. Níveis e desbloqueios são regras do aplicativo, não regras canônicas. Antes de distribuir o projeto, revise as permissões de uso dos nomes, marcas e elementos de Warhammer e de qualquer material de terceiros.

Documentação de instalação consultada em **06/11/2026**: [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/) e [development builds](https://docs.expo.dev/develop/development-builds/introduction/).
