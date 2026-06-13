# Mega Just One — Regras

## Objetivo

Cada mesa do evento é uma equipa. Por turnos, uma equipa tenta adivinhar uma PALAVRA
SECRETA com base em pistas de UMA SÓ PALAVRA escritas pelas equipas adversárias.
Ganha quem tiver mais pontos no final.

Recomendado: 3 ou mais equipas. Com apenas 2 equipas o jogo funciona (uma adivinha, a
outra dá uma pista), mas não há pistas duplicadas — uma das mecânicas mais
divertidas do jogo fica desativada.

## Preparação

O anfitrião prepara uma lista de palavras — por defeito já vem uma lista de cerca de
50 palavras por idioma (`games/justone-words-pt.txt` / `-en.txt`), organizadas por
dificuldade (Fácil/Médio/Difícil), mas pode ser editada antes de começar no ecrã de
configuração — incluindo a escolha do idioma da lista, independente do idioma da
interface. No mesmo ecrã, o anfitrião pode ajustar os valores de pontuação por
dificuldade, incluindo a penalização por erro (ver Pontuação), e definir um limite de
tempo opcional para o envio de pistas — ou manter os valores por defeito.

O anfitrião pode usar dois dispositivos em simultâneo: um em modo **Consola** (vê a
palavra secreta e controla o jogo) e outro em modo **Público** (ecrã/projetor — nunca
mostra a palavra secreta, mesmo durante a fase de pistas).

## Desenrolar de uma Ronda

1. **Escolha da dificuldade**: a equipa que vai adivinhar nesta ronda escolhe, antes
   de a palavra ser revelada a quem quer que seja, um nível de dificuldade — Fácil,
   Médio ou Difícil. Cada nível tem uma pontuação e uma penalização associadas (ver
   Pontuação). Quanto mais difícil, mais pontos a equipa pode ganhar — mas também
   pode arriscar perder mais pontos se errar, dependendo da configuração do
   anfitrião. Se um nível já não tiver palavras novas disponíveis nesta sessão, a
   equipa é avisada e escolhe outro nível.
2. **Sorteio**: o sistema sorteia uma palavra secreta desse nível de dificuldade,
   sem repetir palavras já usadas nesta sessão nesse nível.
3. **Pistas**: a palavra é mostrada a TODAS as equipas, EXCETO a equipa que vai
   adivinhar nesta ronda. Cada uma das outras equipas escreve, em segredo, UMA pista
   de UMA SÓ PALAVRA relacionada com a palavra secreta. Se o anfitrião tiver definido
   um limite de tempo, deixa de ser possível enviar ou editar a pista depois de
   esgotado — mas o anfitrião continua a decidir quando avançar para a validação.
4. **Validação**: quando as pistas chegam, o anfitrião revê cada uma e decide se é
   VÁLIDA ou ANULADA (ver regras abaixo). Pistas idênticas submetidas por duas ou
   mais equipas são automaticamente marcadas como anuladas — mas o anfitrião pode
   corrigir manualmente qualquer pista.
5. **Adivinhação**: a equipa que está a jogar (e o anfitrião) veem todas as pistas
   válidas, e sabem quantas pistas foram anuladas (sem saber o que diziam). Em voz
   alta, a equipa diz a sua resposta — ou, se preferir não arriscar, pode optar por
   PASSAR a vez. O anfitrião regista o resultado: acertou, errou ou passou.
6. **Pontuação** (ver abaixo).
7. **Revelação**: a palavra secreta e TODAS as pistas (incluindo as anuladas) ficam
   visíveis para todos, para que se entenda porque é que cada pista foi ou não
   aceite.
8. **Próxima ronda**: passa a vez à equipa seguinte (por ordem das mesas), que
   escolhe nova dificuldade e recebe uma nova palavra.

## O que torna uma pista inválida?

Tal como no jogo original "Just One", uma pista é ANULADA se:

- For igual a outra pista submetida nesta ronda (maiúsculas/minúsculas e acentos não
  contam para este efeito) — detetado automaticamente, o anfitrião confirma.
- For a própria palavra secreta, ou contiver a palavra secreta dentro de si (ex: se a
  palavra secreta for "praia", a pista "praia" ou "praiana" não é válida).
- For um nome próprio claramente associado de forma óbvia/literal à palavra secreta.
- For composta por mais de uma palavra, números, gestos, ou qualquer coisa que não
  seja uma única palavra escrita.
- Não tiver sido submetida a tempo (sem pista = anulada por omissão).

Estas decisões cabem sempre ao anfitrião — em caso de dúvida, o bom senso e o
espírito de diversão devem prevalecer.

## Pontuação

A pontuação por acerto e a penalização por erro dependem da dificuldade escolhida no
início da ronda. Estes são os valores por defeito (o anfitrião pode alterá-los no
ecrã inicial, antes de começar):

| Dificuldade | Equipa que adivinha (se acertar) | Cada pista válida (se acertar) | Penalização por erro |
|---|---|---|---|
| Fácil | +2 | +1 | -1 |
| Médio | +3 | +1 | -1 |
| Difícil | +5 | +1 | -1 |

- Se a equipa adivinhar corretamente:
  - a equipa que adivinhou ganha os pontos da dificuldade escolhida;
  - CADA equipa cuja pista foi considerada válida ganha o bónus configurado (+1 por
    defeito), também consoante a dificuldade.
- Se a equipa NÃO adivinhar:
  - a equipa que tentou perde a penalização configurada para essa dificuldade (nunca
    desce abaixo de 0) — por defeito -1 em todos os níveis, mas o anfitrião pode
    definir valores diferentes por dificuldade (ex.: -1/-2/-3 para um gradiente mais
    arriscado nos níveis difíceis);
  - as equipas que deram pistas não ganham nem perdem pontos nesta ronda.
- Se a equipa PASSAR a vez (em vez de arriscar uma resposta):
  - ninguém ganha ou perde pontos nesta ronda.

O anfitrião pode ainda ajustar manualmente a pontuação de qualquer equipa em mais ou
menos 1 ponto, em caso de erro ou situação excecional.

## Fim de Jogo

Não há um número fixo de rondas — o anfitrião decide quando terminar. Para garantir
que todas as equipas têm o mesmo número de oportunidades de adivinhar, arquivar e
encerrar a sessão (ou arquivar e começar de novo) só é possível no fim de uma "volta
completa" — quando todas as equipas já adivinharam o mesmo número de vezes; a app
mostra quantas voltas completas já decorreram. "Pausar Sessão" está sempre
disponível, sem esta restrição, para interromper o jogo sem arquivar. Vence a equipa
com mais pontos no final.
