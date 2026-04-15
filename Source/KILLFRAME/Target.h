#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Target.generated.h"

UCLASS()
class KILLFRAME_API ATarget : public AActor
{
    GENERATED_BODY()

public:
    ATarget() {
        PrimaryActorTick.bCanEverTick = false;
    }

protected:
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Target", meta=(ClampMin="0.0"))
    float Health = 100.f;

public:
    virtual float TakeDamage(float DamageAmount, const FDamageEvent& DamageEvent, AController* EventInstigator, AActor* DamageCauser) override;
};
